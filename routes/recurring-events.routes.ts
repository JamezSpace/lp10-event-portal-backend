import { FastifyInstance } from "fastify";
import {
	recurring_events_schema,
	RecurringEvent,
} from "../interfaces/events.types";
import {
    deleteARecurringEvent,
	getAllRecurringEvents,
	postARecurringEvent,
    putARecurringEvent,
} from "../controllers/recurring-events.controller";
import { Partial, String, Type } from "@fastify/type-provider-typebox";

export async function recurringEventPlugin(
	fastify: FastifyInstance,
	opts: any
) {
	// get all recurring events
	fastify.get("/", getAllRecurringEvents);

	// post recurring events
	fastify.post(
		"/",
		{ schema: { body: recurring_events_schema } },
		postARecurringEvent
	);

    // put a recurring events
	fastify.put(
		"/:id",
		{ schema: { body: Type.Partial(recurring_events_schema) } },
		putARecurringEvent
	);

    // delete a recurring event
    fastify.delete(
        "/:id",
        deleteARecurringEvent
    )
}
