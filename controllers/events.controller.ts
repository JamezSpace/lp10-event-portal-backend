import { FastifyRequest, FastifyReply } from "fastify";
import { Collection } from "mongodb";
import { mongo_client } from "../utils/db.utils";
import { Event } from "../interfaces/events.types";

const events: Collection = mongo_client.db().collection("events");

// get all events
const getAllEvents = async (request: FastifyRequest, reply: FastifyReply) => {
	try {
		const result = await events
			.aggregate([
				{
					$lookup: {
						from: "recurring_events", // name of the target collection
						localField: "recurring_event_id",
						foreignField: "_id",
						as: "recurring_event_details",
					},
				},
				{
					$unwind: {
						path: "$recurring_event_details",
						preserveNullAndEmptyArrays: true, // keep events without a match
					},
				},
			])
			.toArray();

		return reply.code(200).send({
			success: true,
			message: "Events data retrieved successfully",
			data: result,
		});
	} catch (error: any) {
		return reply.code(500).send({
			success: false,
			message: "Internal server error",
			error: error.message,
		});
	}
};

// post an event
const postAnEvent = async (
	request: FastifyRequest<{ Body: Partial<Event> }>,
	reply: FastifyReply
) => {
	try {
		const event_data = request.body;

		const result = await events.insertOne({
			name: event_data.name,
			type: event_data.type,
			recurring_event_id: event_data.recurring_event_id,
			venue: event_data.venue,
			created_at: Date.now()
		});

		return reply.code(201).send({
			success: true,
			message: "Event created successfully",
			data: result.insertedId,
		});
	} catch (error: any) {
		return reply.code(500).send({
			success: false,
			message: "Internal server error",
			error: error.message,
		});
	}
};

export { getAllEvents, postAnEvent };
