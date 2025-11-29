import { Collection, ObjectId } from "mongodb";
import { mongo_client } from "../utils/db.utils";
import { FastifyReply, FastifyRequest } from "fastify";
import { EventRegistration } from "../interfaces/registration.types";
import { Payer } from "../interfaces/payer.interfaces";

// DB Collections
const registrations: Collection = mongo_client.db().collection("registrations");
const events: Collection = mongo_client.db().collection("events");
const persons: Collection = mongo_client.db().collection("persons");
const payers: Collection<Payer> = mongo_client.db().collection("payers");
const payments: Collection = mongo_client.db().collection("payments");

/**
 * @desc Retrieve a registration using its transaction reference.
 * @route GET /registrations/by-ref/:transaction_ref
 */
const getRegistrationByRef = async (transaction_ref: string) => {
	try {
		// find payer via transaction_ref
		const payer = await payers.findOne({ transaction_ref });
		if (!payer)
			throw new Error(
				"Payer with this transaction reference wasnt found"
			);

		// fetch all registrations made under the payer:
		const regs = await registrations
			.find({ payer_id: payer._id })
			.toArray();

		// extract all person IDs:
		const personIds = regs.map((r) => new ObjectId(r.person_id));

		// fetch all persons
		const people = await persons
			.find({ _id: { $in: personIds } })
			.toArray();

		return {
			payer,
			people,
			registrations: regs,
			valid: true,
		};
	} catch (error: any) {
		console.error(error);
		throw new Error(error.message);
	}
};

/**
 * @desc Retrieve all event registrations with event + person details.
 * @route GET /registrations
 */
const getAllRegistrations = async (
    request: FastifyRequest<{Querystring: {page?: string, limit?: string}}>,
    reply: FastifyReply
) => {
    try {
        const page = Math.max(1, parseInt(request.query.page as string) || 1);
        const limit = Math.max(1, parseInt(request.query.limit as string) || 10);
        const skip = (page - 1) * limit;

        const result = await registrations
            .aggregate([
                // Join event details
                {
                    $lookup: {
                        from: "events",
                        localField: "event_id",
                        foreignField: "_id",
                        as: "event_details",
                    },
                },
                { $unwind: "$event_details" },

                // Join person details
                {
                    $lookup: {
                        from: "persons",
                        localField: "person_id",
                        foreignField: "_id",
                        as: "person_details",
                    },
                },
                { $unwind: "$person_details" },

                // Join payer details
                {
                    $lookup: {
                        from: "payers",
                        localField: "payer_id",
                        foreignField: "_id",
                        as: "payer_details",
                    },
                },
                { $unwind: "$payer_details" },

                // Join payment details (optional)
                {
                    $lookup: {
                        from: "payments",
                        localField: "payment_id",
                        foreignField: "_id",
                        as: "payment_details",
                    },
                },
                {
                    $unwind: {
                        path: "$payment_details",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                { $skip: skip },
                { $limit: limit },
            ])
            .toArray();

        const total = await registrations.countDocuments();

        return reply.code(200).send({
            success: true,
            message: "Event registrations retrieved successfully",
            data: result,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
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

/**
 * @desc Registers MULTIPLE persons for an event.
 *       One payer → many persons → many registrations.
 * @route POST /registrations
 */
const postAnEventRegistration = async (
	request: FastifyRequest<{ Body: EventRegistration }>,
	reply: FastifyReply
) => {
	try {
		const {
			event_id,
			person_ids,
			payer_id,
			status = "pending",
		} = request.body;

		// Data validation
		if (!Array.isArray(person_ids)) {
			return reply.status(400).send({
				success: false,
				message: "Malformed Data Type",
				error: "person_ids must be an array",
			});
		}

		// Prepare documents
		const docs = person_ids.map((p_id) => ({
			event_id: new ObjectId(event_id),
			person_id: new ObjectId(p_id),
			payer_id: new ObjectId(payer_id),
			transaction_ref: "not generated yet",
			status,
			checked_in: false,
			created_at: new Date().toISOString(),
			modified_at: new Date().toISOString(),
		}));

		const inserted = await registrations.insertMany(docs);

		return reply.code(201).send({
			success: true,
			message: "Event registration(s) completed",
			data: inserted.insertedIds,
		});
	} catch (error: any) {
		return reply.code(500).send({
			success: false,
			message: "Internal server error",
			error: error.message,
		});
	}
};

const putAnEventRegistration = async (
	request: FastifyRequest<{ Body: Partial<EventRegistration> }>,
	reply: FastifyReply
) => {
	try {
		// only working out implementation for checking in or out
		const request_body = request.body;

		if (!request_body.person_id) {
			return reply.code(400).send({
				success: false,
				message: "Incomplete credentials (person id)",
			});
		}

		const result = await registrations.updateOne(
			{ person_id: new ObjectId(request_body.person_id) },
			{ $set: { checked_in: request_body.checked_in } }
		);

		if (result.matchedCount === 0) {
			return reply.code(404).send({
				success: false,
				message: "Person not found",
			});
		}

		return reply.code(200).send({
			success: true,
			message: "Person checked in successfully!",
		});
	} catch (error: any) {
		return reply.code(500).send({
			success: false,
			message: "Internal server error",
			error: error.message,
		});
	}
};

export {
	getAllRegistrations,
	getRegistrationByRef,
	postAnEventRegistration,
	putAnEventRegistration,
};
