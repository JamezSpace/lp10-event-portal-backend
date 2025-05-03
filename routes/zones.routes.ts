import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify"
import { Collection } from "mongodb";
import client from "../utils/db.utils";

const zones: Collection = client.db().collection("zones");

export async function zonesPlugin(fastify: FastifyInstance, opts: any) {
    // fetch all zones
    fastify.get('/', async (request: FastifyRequest, response: FastifyReply) => {
        try {
            const result = await zones.find().toArray()
            
            return response.code(200).send(result)
        } catch (error: any) {
            console.error(error)

            return response.code(500).send({ 
                message: 'Internal server error', 
                error: error.message 
            });
        }
    })

    // create a new zone
    fastify.post('/', async (request: FastifyRequest, response: FastifyReply) => {
        try {
            const inserted = await zones.insertOne(request.body as Record<string, any>);

            if (inserted.acknowledged) {
                return response.code(201).send({ 
                    message: 'Zone created successfully', 
                    id: inserted.insertedId
                });
            } else {
                return response.code(400).send({ 
                    message: 'Failed to create zone' 
                });
            }
        } catch (error: any) {
            console.error(error);

            return response.code(500).send({ 
                message: 'Internal server error', 
                error: error.message 
            });
        }
    })
}

