import { Kafka, KafkaConfig, logLevel } from 'kafkajs';
import { env } from '../config/env';
import { logger } from '../config/logger';

const brokers = env.KAFKA_BROKERS.split(',').map((b) => b.trim());

const kafkaConfig: KafkaConfig = {
  clientId: env.KAFKA_CLIENT_ID,
  brokers,
  logLevel: logLevel.NOTHING,
  retry: {
    initialRetryTime: 300,
    retries: 5,
  },
};

// Configure SASL/SSL if credentials are provided (e.g. Upstash Kafka or Confluent Cloud)
if (env.KAFKA_SSL || (env.KAFKA_USERNAME && env.KAFKA_PASSWORD)) {
  kafkaConfig.ssl = true;
  if (env.KAFKA_USERNAME && env.KAFKA_PASSWORD) {
    const mechanism = env.KAFKA_SASL_MECHANISM || 'plain';
    kafkaConfig.sasl = {
      mechanism: mechanism as any,
      username: env.KAFKA_USERNAME,
      password: env.KAFKA_PASSWORD,
    } as any;
  }
}

export const kafka = new Kafka(kafkaConfig);
