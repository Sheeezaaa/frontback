import { Producer } from 'kafkajs';
import { kafka } from './kafkaClient';
import { logger } from '../config/logger';

let producer: Producer | null = null;
let isConnected = false;

export async function getProducer(): Promise<Producer> {
  if (!producer) {
    producer = kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
    });

    producer.on('producer.connect', () => {
      isConnected = true;
      logger.info('Kafka Producer connected successfully');
    });

    producer.on('producer.disconnect', () => {
      isConnected = false;
      logger.warn('Kafka Producer disconnected');
    });
  }

  if (!isConnected) {
    try {
      await producer.connect();
      isConnected = true;
    } catch (error) {
      logger.error('Failed to connect Kafka Producer', error);
      throw error;
    }
  }

  return producer;
}

/**
 * Publish event with tenant_id as partition key.
 * This guarantees strict FIFO ordering within each tenant partition.
 */
export async function publishEvent(
  topic: string,
  key: string,
  payload: any,
  headers?: Record<string, string>
): Promise<void> {
  const prod = await getProducer();
  await prod.send({
    topic,
    messages: [
      {
        key,
        value: JSON.stringify(payload),
        headers: {
          'content-type': 'application/json',
          'published-at': new Date().toISOString(),
          ...headers,
        },
      },
    ],
  });
}

export async function disconnectProducer(): Promise<void> {
  if (producer && isConnected) {
    try {
      await producer.disconnect();
      isConnected = false;
      logger.info('Kafka Producer disconnected gracefully');
    } catch (error) {
      logger.error('Error disconnecting Kafka Producer', error);
    }
  }
}
