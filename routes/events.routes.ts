import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getAllEvents } from "../controllers/events.controller";

export async function  eventPlugin (fastify: FastifyInstance, opts: any) {
    // get all events
    fastify.get('/events', getAllEvents)

    
}