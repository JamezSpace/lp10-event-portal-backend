import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { deleteAnEvent, getAllEvents, postAnEvent } from "../controllers/events.controller";
import { event_schema } from "../interfaces/events.types";

export async function  eventPlugin (fastify: FastifyInstance, opts: any) {
    // get all events
    fastify.get('/', getAllEvents)

    // post an event
    fastify.post('/', {schema: { body: event_schema } }, postAnEvent)
    
       // delete an event
    fastify.delete(
        "/:id",
        deleteAnEvent
    )
}