import { MongoClient, ServerApiVersion } from "mongodb";

const password = encodeURIComponent(process.env?.DB_PASSWORD || ""),
    uri = `mongodb+srv://${process.env?.DB_USER}:${password}@freecluster.jdr5d.mongodb.net/lp10?retryWrites=true&w=majority&appName=FreeCluster`
    // uri = 'mongodb://127.0.0.1:27017/lp10-event-portal'
    
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client: MongoClient = new MongoClient(uri, {
    maxPoolSize: 20,
    minPoolSize: 2,
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let isConnected = false;
export async function connect_to_database(): Promise<void> {
    if (isConnected) return;

    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        console.info("------------ You successfully connected to MongoDB! ------------");
        isConnected = true;
    } catch (err: any) {
        console.error('Failed to connect to MongoDB', err);
        throw new Error(err.name);
    }
}

export default client;