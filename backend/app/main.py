from contextlib import asynccontextmanager

from aiokafka import AIOKafkaConsumer
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, reports, uploads, reviews, comments, audit, notifications
from app.config import settings
from app.database import engine, Base
from app.kafka.consumers.notification_consumer import NotificationConsumer
from app.kafka.producer import KafkaProducer
from app.scheduler.jobs import check_activations, check_reminders


async def consume_notifications() -> None:
    consumer = AIOKafkaConsumer(
        *NotificationConsumer.TOPICS,
        bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
        group_id="reportflow-notifications",
        auto_offset_reset="earliest",
    )
    await consumer.start()
    try:
        async for msg in consumer:
            await NotificationConsumer.process(msg.topic, msg.value)
    finally:
        await consumer.stop()


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    scheduler = None
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        scheduler = AsyncIOScheduler()
        scheduler.add_job(check_activations, "interval", seconds=60, id="check_activations")
        scheduler.add_job(check_reminders, "interval", seconds=60, id="check_reminders")
        scheduler.start()
    except Exception:
        pass

    consumer_task = None
    try:
        import asyncio
        consumer_task = asyncio.create_task(consume_notifications())
    except Exception:
        pass

    yield

    if scheduler:
        scheduler.shutdown(wait=False)
    if consumer_task:
        consumer_task.cancel()
    await KafkaProducer.shutdown()
    await engine.dispose()


app = FastAPI(title="ReportFlow", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(reports.router)
app.include_router(uploads.router)
app.include_router(reviews.router)
app.include_router(comments.router)
app.include_router(audit.router)
app.include_router(notifications.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
