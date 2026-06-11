#!/bin/bash
# Creates all Kafka topics for ReportFlow
# Run: ./scripts/create_kafka_topics.sh

KAFKA_CONTAINER="reportflow-kafka"
BOOTSTRAP_SERVER="localhost:9092"

TOPICS=(
  "report.created"
  "report.activated"
  "report.reminder"
  "report.submitted"
  "report.reuploaded"
  "report.redo_requested"
  "report.approved"
  "report.rejected"
  "report.canceled"
  "notification.created"
)

for topic in "${TOPICS[@]}"; do
  docker exec "$KAFKA_CONTAINER" kafka-topics \
    --create \
    --topic "$topic" \
    --bootstrap-server "$BOOTSTRAP_SERVER" \
    --partitions 1 \
    --replication-factor 1 \
    --if-not-exists
  echo "Created topic: $topic"
done

echo "All topics created successfully."
