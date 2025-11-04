import { FastifyReply, FastifyRequest } from "fastify";
import { Collection, InsertManyResult, ObjectId } from "mongodb";
import { Person } from "../interfaces/person.types";
import {mongo_client} from "../utils/db.utils";

const persons: Collection = mongo_client.db().collection("persons");

// GET all
const getAllPersons = async (
	_request: FastifyRequest,
	response: FastifyReply
) => {
	try {
		const result = await persons.find().toArray();

		return response.code(200).send({
			success: true,
			message: "Persons data retrieved successfully",
			data: result,
		});
	} catch (error: any) {
		return response.code(500).send({
			success: false,
			message: "Internal server error",
			error: error.message,
		});
	}
};

//GET one
const getOnePerson = async (
	request: FastifyRequest<{ Params: { id: string } }>,
	response: FastifyReply
) => {
	try {
		const { id } = request.params;

		if (!ObjectId.isValid(id)) {
			return response.code(400).send({ error: "Invalid ID format" });
		}

		const person = await persons.findOne({ _id: new ObjectId(id) });

		if (!person) {
			return response.code(404).send({ error: "Person not found" });
		}

		return response.code(200).send({
			success: true,
			message: "Person data retrieved successfully",
			data: person,
		});
	} catch (error: any) {
		return response.code(500).send({
			success: false,
			message: "Internal server error",
			error: error.message,
		});
	}
};

// POST person or persons
const postPersons = async (
	request: FastifyRequest<{ Body: Person[] }>,
	response: FastifyReply
) => {
	try {
		let resultMany: InsertManyResult<Document>;

		// Determine if the request body is an array or a single object
		if (Array.isArray(request.body)) {
			resultMany = await persons.insertMany(request.body);

			if (!resultMany.acknowledged) throw new Error("Names Not Saved!");

			return response.code(201).send({
                success: true,
				message: `${resultMany.insertedCount} Inserts Successful!`,
				data: {
					ids: resultMany.insertedIds,
				},
			});
		}

		const result = await persons.insertOne(request.body);

		if (!result.acknowledged) throw new Error("Names Not Saved!");

		return response.code(201).send({
			success: true,
			message: 'Insert Successful!',
			data: {
				ids: result.insertedId,
			},
		});
	} catch (error: any) {
		return response.code(500).send({
			success: false,
			message: "Internal server error",
			error: error.message,
		});
	}
};

// PUT person
const putPerson = async (
	request: FastifyRequest<{ Params: { id: string }; Body: Partial<Person> }>,
	response: FastifyReply
) => {
	try {
		const { id } = request.params;
		const updates = request.body;

		if (!ObjectId.isValid(id)) {
			return response.code(400).send({ error: "Invalid ID format" });
		}

		const result = await persons.updateOne(
			{ _id: new ObjectId(id) },
			{ $set: updates }
		);

		if (result.matchedCount === 0) {
			return response.code(404).send({ error: "Person not found" });
		}

		return response.code(204).send({
			success: true,
			message: "Person updated successfully!",
		});
	} catch (error: any) {
		return response.code(500).send({
			success: false,
			message: "Internal server error",
			error: error.message,
		});
	}
};

// PUT persons
const putPersons = async (
	request: FastifyRequest<{
		Body: {
			ids: string[];
			updates: Partial<Person>;
		};
	}>,
	reply: FastifyReply
) => {
	try {
		const { ids, updates } = request.body;

		if (!Array.isArray(ids) || ids.some((id) => !ObjectId.isValid(id))) {
			return reply.code(400).send({
				success: false,
				message: "unsuccessful",
				reason: "invalid ids!",
			});
		}

		const objectIds = ids.map((i) => new ObjectId(i));

		const result = await persons.updateMany(
			{ _id: { $in: objectIds } },
			{ $set: updates }
		);

		if (result.matchedCount === 0) {
			return reply.code(404).send({
				success: false,
				message: "Update unsuccessful",
				error: "Persons not found!",
			});
		}

		return reply.code(204).send({
			success: true,
			message: "successful",
			data: {
				modifiedCount: result.modifiedCount,
			},
		});
	} catch (error: any) {
		return reply.code(500).send({
			success: false,
			message: "unsuccessful",
			error: error.message,
		});
	}
};

// DELETE person
const deletePerson = async (
	request: FastifyRequest<{ Params: { id: string } }>,
	response: FastifyReply
) => {
	try {
		const { id } = request.params;
		if (!ObjectId.isValid(id)) {
			return response.code(400).send({
				success: true,
				error: "Invalid ID format",
			});
		}

		const result = await persons.deleteOne({ _id: new ObjectId(id) });

		if (result.deletedCount === 0) {
			return response.code(404).send({
				success: false,
				error: "Person not found",
			});
		}

		return response.code(204).send({
			success: true,
			message: "Person deleted successfully!",
		});
	} catch (error: any) {
		return response.code(500).send({
			success: false,
			message: "Internal server error",
			error: error.message,
		});
	}
};

export {
	deletePerson,
	getAllPersons,
	getOnePerson,
	postPersons,
	putPerson,
	putPersons,
};
