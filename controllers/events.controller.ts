import { FastifyRequest, FastifyReply } from "fastify";
import { Collection, ObjectId } from "mongodb";
import { mongo_client } from "../utils/db.utils";
import { Event } from "../interfaces/events.types";

const events: Collection<Event> = mongo_client.db().collection("events");

// GET all events
const getAllEvents = async (request: FastifyRequest, reply: FastifyReply) => {
	try {
		const result = await events.find().toArray();

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

// POST an event
const postAnEvent = async (
	request: FastifyRequest<{ Body: Partial<Event> }>,
	reply: FastifyReply
) => {
	try {
		const data = request.body;

		// Validate minimum fields
		if (!data.name || !data.type || !data.venue || !data.year) {
			return reply.code(400).send({
				success: false,
				message: "Incomplete event data",
			});
		}

		// Prevent duplicate recurring events in the same year
		if (data.type === "recurring" && data.recurring_event_id) {
			const alreadyExists = await events.findOne({
				type: "recurring",
				recurring_event_id: data.recurring_event_id,
				year: data.year,
			});

			if (alreadyExists) {
				return reply.code(409).send({
					success: false,
					message: "Recurring event has already been registered for this year!",
				});
			}
		}

		const now = Date.now();
		const result = await events.insertOne({
			name: data.name!,
			type: data.type!,
			platform: data.platform || null,
			paid_event: data.paid_event ?? false,
			price: data.price ?? [],
			recurring_event_id: data.recurring_event_id || null,
			venue: data.venue!,
			year: data.year!,
            start_date: data.start_date,
            start_time: data.start_time,
			created_at: now
		} as Event);

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

// DELETE an event
const deleteAnEvent = async (
	request: FastifyRequest<{ Params: { id: string } }>,
	reply: FastifyReply
) => {
	try {
		const { id } = request.params;

		if (!ObjectId.isValid(id)) {
			return reply.code(400).send({
				success: false,
				error: "Invalid ID provided",
			});
		}

		const result = await events.deleteOne({ _id: new ObjectId(id) });

		if (result.deletedCount === 0) {
			return reply.code(404).send({
				success: false,
				error: "Event not found",
			});
		}

		return reply.code(204).send({
			success: true,
			message: "Event deleted successfully",
		});
	} catch (error: any) {
		return reply.code(500).send({
			success: false,
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

export { getAllEvents, postAnEvent, deleteAnEvent };
