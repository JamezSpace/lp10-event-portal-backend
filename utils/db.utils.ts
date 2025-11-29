import { MongoClient, ServerApiVersion } from "mongodb";
import { createClient, RedisClientOptions, RedisClientType } from "redis";

const password = encodeURIComponent(process.env?.DB_PASSWORD || ""),
	// uri = `mongodb+srv://${process.env?.DB_USER}:${password}@freecluster.jdr5d.mongodb.net/lp10?retryWrites=true&w=majority&appName=FreeCluster`;
uri = 'mongodb://127.0.0.1:27017/lp10-event-portal'

// Create a Mongo client with a MongoClientOptions object to set the Stable API version
const mongo_client: MongoClient = new MongoClient(uri, {
	maxPoolSize: 20,
	minPoolSize: 2,
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});

let isConnected = false;
export async function connect_to_database(): Promise<void> {
	if (isConnected) return;

	try {
		// Connect the mongo_client to the server	(optional starting in v4.7)
		await mongo_client.connect();

		console.info(
			"------------ You successfully connected to MongoDB! ------------"
		);
		isConnected = true;
	} catch (err: any) {
		console.error("Failed to connect to MongoDB", err);
		throw new Error(err.name);
	}
}

const redis_client_config: RedisClientOptions = {
	url: process.env?.REDIS_CONN_URL || "redis://localhost:6380",
};
const redis_client = createClient(redis_client_config);

redis_client.on("error", (err: any) => console.error("Redis Client Error:", err));

let redisConnected = false;
export async function connect_to_redis() {
	if (redisConnected) return;
	await redis_client.connect();
	console.info("------------ Connected to Redis! ------------");
	redisConnected = true;
}

export { mongo_client, redis_client };
