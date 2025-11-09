import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getAllEvents, postAnEvent } from "../controllers/events.controller";
import { event_schema } from "../interfaces/events.types";

export async function  eventPlugin (fastify: FastifyInstance, opts: any) {
    // get all events
    fastify.get('/events', getAllEvents)

    // post an event
    fastify.post('/events', {schema: { body: event_schema } }, postAnEvent)
    
}