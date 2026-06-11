import json

from aiokafka import AIOKafkaProducer

from app.config import settings


class KafkaProducer:
    _instance: AIOKafkaProducer | None = None

    async def get_producer(self) -> AIOKafkaProducer:
        if KafkaProducer._instance is None:
            KafkaProducer._instance = AIOKafkaProducer(
                bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
                value_serializer=lambda v: json.dumps(v).encode(),
            )
            await KafkaProducer._instance.start()
        return KafkaProducer._instance

    async def emit(self, topic: str, payload: dict) -> None:
        producer = await self.get_producer()
        await producer.send(topic, payload)

    @classmethod
    async def shutdown(cls) -> None:
        if cls._instance is not None:
            await cls._instance.stop()
            cls._instance = None
