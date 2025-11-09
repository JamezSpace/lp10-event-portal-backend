import { FastifyReply, FastifyRequest } from "fastify";
import { mongo_client } from "../utils/db.utils";
import { RecurringEvent } from "../interfaces/events.types";
import { ObjectId } from "mongodb";

const recurring_events = mongo_client.db().collection("recurring_events");

const getAllRecurringEvents = async (
	request: FastifyRequest,
	reply: FastifyReply
) => {
	try {
		const result = await recurring_events.find().toArray();

		return reply.code(200).send({
			success: true,
			message: "Recurring events data retrieved successfully",
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

const postARecurringEvent = async (
	request: FastifyRequest<{ Body: RecurringEvent }>,
	reply: FastifyReply
) => {
	try {
		const result = await recurring_events.insertOne({
			name: request.body.name,
			description: request.body.description,
			month: request.body.month,
			duration_in_days: request.body.duration_in_days,
			created_at: Date.now(),
			modified_at: Date.now(),
		});

		if (!result.acknowledged) throw new Error("Recurring event not saved!");

		return reply.code(201).send({
			success: true,
			message: "Insert Successful!",
			data: {
				id: result.insertedId,
			},
		});
	} catch (error: any) {
		return reply.code(500).send({
			success: false,
			message: "Internal server error",
			error: error.message,
		});
	}
};

const putARecurringEvent = async (
	request: FastifyRequest<{
		Params: { id: string };
		Body: Partial<RecurringEvent>;
	}>,
	reply: FastifyReply
) => {
	try {
		const { id } = request.params;
		const updates = request.body;

		if (!id)
			reply.code(400).send({
				success: false,
				message: "Incomplete Credentails (no id specified)",
			});

		if (!ObjectId.isValid(id)) {
			return reply.code(400).send({
				success: false,
				message: "Invalid ID format",
			});
		}

		const result = await recurring_events.updateOne(
			{ _id: new ObjectId(id) },
			{ $set: updates }
		);

		if (result.matchedCount === 0) {
			return reply.code(404).send({
				success: false,
				message: "Person not found",
			});
		}

		return reply.code(204).send({
			success: true,
			message: "Person updated successfully!",
		});
	} catch (error: any) {
		return reply.code(500).send({
			success: false,
			message: "Internal server error",
			error: error.message,
		});
	}
};

const deleteARecurringEvent = async (
	request: FastifyRequest<{ Params: { id: string } }>,
	reply: FastifyReply
) => {
	try {
		const { id } = request.params;
		if (!id)
			return reply.code(400).send({
				success: false,
				message: "Incomplete credentials (no id provided)",
			});

		if (!ObjectId.isValid(id)) {
			return reply.code(400).send({
				success: false,
				message: "Invalid ID format",
			});
		}

		const result = await recurring_events.deleteOne({
			_id: new ObjectId(id),
		});

		if (result.deletedCount === 0) {
			return reply.code(404).send({
				success: false,
				message: "Recurring event not found",
			});
		}

		return reply.code(204).send({
			success: true,
			message: "Recurring event deleted successfully!",
		});
	} catch (error: any) {
		return reply.code(500).send({
			success: false,
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

export {
	getAllRecurringEvents,
	postARecurringEvent,
	putARecurringEvent,
	deleteARecurringEvent,
};
