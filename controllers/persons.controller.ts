import { FastifyReply, FastifyRequest } from "fastify";
import { Collection, InsertManyResult, ObjectId } from "mongodb";
import { PersonWithChurch } from "../interfaces/person.types";
import { mongo_client } from "../utils/db.utils";

const persons: Collection = mongo_client.db().collection("persons");
const church: Collection = mongo_client.db().collection("church");

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
	request: FastifyRequest<{ Body: PersonWithChurch[] }>,
	response: FastifyReply
) => {
	const session = mongo_client.startSession();

	try {
		await session.withTransaction(async () => {
			const person_details = request.body;

			// Extract core person fields
			const personInsertPayload = person_details.map((p) => ({
				first_name: p.first_name,
				last_name: p.last_name,
				email: p.email,
				year_of_birth: p.year_of_birth,
				gender: p.gender,
				origin: p.origin,
			}));

			// INSERT INTO PERSONS
			const personsInsertResult = await persons.insertMany(
				personInsertPayload
			);

			if (!personsInsertResult.acknowledged) {
				throw new Error("Failed to insert persons");
			}

			const churchDetailsPayload: any[] = [];

			// Build church_details inserts using the newly inserted IDs
			person_details.forEach((item, index) => {
				const personId = personsInsertResult.insertedIds[index];

				const {
					parish,
					zone,
					region,
					province,
					denomination,
					details,
				} = item;

				// Only insert if at least one church-related field exists
				if (
					parish ||
					zone ||
					region ||
					province ||
					denomination ||
					details
				) {
					churchDetailsPayload.push({
						person_id: personId,
						parish,
						zone,
						region,
						province,
						denomination,
						details,
					});
				}
			});

			// INSERT INTO CHURCH_DETAILS (if needed)
			let churchInsertResult = null;

			if (churchDetailsPayload.length > 0) {
				churchInsertResult = await church.insertMany(
					churchDetailsPayload
				);

				if (!churchInsertResult.acknowledged) {
					throw new Error("Failed to insert church-specific data");
				}
			}

			return response.code(201).send({
				success: true,
				message:
					personsInsertResult.insertedCount > 1
						? `${person_details.length} persons saved successfully`
						: "Person saved successfully",
				data: {
					person_ids: personsInsertResult.insertedIds,
					church_detail_ids: churchInsertResult?.insertedIds || null,
				},
			});
		});
	} catch (error: any) {
		return response.code(500).send({
			success: false,
			message: "Internal server error",
			error: error.message,
		});
	} finally {
		await session.endSession();
	}
};

// PUT person
const putPerson = async (
	request: FastifyRequest<{
		Params: { id: string };
		Body: Partial<PersonWithChurch>;
	}>,
	response: FastifyReply
) => {
	try {
		const { id } = request.params;
		const updates = request.body;

		if (!ObjectId.isValid(id)) {
			return response.code(400).send({
				success: false,
				message: "Invalid ID format",
			});
		}

		// --- Split updates ---
		const personUpdates: any = {};
		const churchUpdates: any = {};

		const personFields = [
			"first_name",
			"last_name",
			"email",
			"year_of_birth",
			"gender",
			"origin",
		];

		const churchFields = [
			"parish",
			"zone",
			"region",
			"province",
			"denomination",
			"details",
		];

		for (const key of Object.keys(updates)) {
			if (personFields.includes(key))
				personUpdates[key] = (updates as any)[key];
			if (churchFields.includes(key))
				churchUpdates[key] = (updates as any)[key];
		}

		// --- Update person ---
		if (Object.keys(personUpdates).length > 0) {
			const result = await persons.updateOne(
				{ _id: new ObjectId(id) },
				{ $set: personUpdates }
			);

			if (result.matchedCount === 0) {
				return response.code(404).send({
					success: false,
					message: "Person not found",
				});
			}
		}

		// --- Update or insert church details ---
		if (Object.keys(churchUpdates).length > 0) {
			const existingChurch = await church.findOne({
				person_id: new ObjectId(id),
			});

			if (!existingChurch) {
				// insert new church record
				await church.insertOne({
					person_id: new ObjectId(id),
					...churchUpdates,
				});
			} else {
				// update existing church record
				await church.updateOne(
					{ person_id: new ObjectId(id) },
					{ $set: churchUpdates }
				);
			}
		}

		return response.code(200).send({
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
// PUT /persons  (bulk update many persons + church details)
const putPersons = async (
	request: FastifyRequest<{
		Body: {
			ids: string[];
			updates: Partial<PersonWithChurch>;
		};
	}>,
	reply: FastifyReply
) => {
	try {
		const { ids, updates } = request.body;

		if (!Array.isArray(ids) || ids.some((id) => !ObjectId.isValid(id))) {
			return reply.code(400).send({
				success: false,
				message: "Invalid IDs provided",
			});
		}

		const objectIds = ids.map((id) => new ObjectId(id));

		// --- Split fields ---
		const personUpdates: any = {};
		const churchUpdates: any = {};

		const personFields = [
			"first_name",
			"last_name",
			"email",
			"year_of_birth",
			"gender",
			"origin",
		];

		const churchFields = [
			"parish",
			"zone",
			"region",
			"province",
			"denomination",
			"details",
		];

		for (const key of Object.keys(updates)) {
			if (personFields.includes(key))
				personUpdates[key] = (updates as any)[key];
			if (churchFields.includes(key))
				churchUpdates[key] = (updates as any)[key];
		}

		// --- Update persons collection ---
		let personResult = null;
		if (Object.keys(personUpdates).length > 0) {
			personResult = await persons.updateMany(
				{ _id: { $in: objectIds } },
				{ $set: personUpdates }
			);
		}

		// --- Update church_details for each person ---
		let modifiedChurch = 0;

		if (Object.keys(churchUpdates).length > 0) {
			for (const pid of objectIds) {
				const exists = await church.findOne({ person_id: pid });

				if (!exists) {
					await church.insertOne({
						person_id: pid,
						...churchUpdates,
					});
					modifiedChurch++;
				} else {
					const cRes = await church.updateOne(
						{ person_id: pid },
						{ $set: churchUpdates }
					);
					if (cRes.modifiedCount > 0) modifiedChurch++;
				}
			}
		}

		return reply.code(200).send({
			success: true,
			message: "Bulk update completed",
			data: {
				persons_modified: personResult?.modifiedCount || 0,
				church_modified: modifiedChurch,
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

// DELETE person
const deletePerson = async (
	request: FastifyRequest<{ Params: { id: string } }>,
	response: FastifyReply
) => {
	try {
		const { id } = request.params;
		if (!id)
			return response.code(400).send({
				success: false,
				message: "Incomplete credentials (no id provided)",
			});

		if (!ObjectId.isValid(id)) {
			return response.code(400).send({
				success: false,
				message: "Invalid ID format",
			});
		}

		const result = await persons.deleteOne({ _id: new ObjectId(id) });

		if (result.deletedCount === 0) {
			return response.code(404).send({
				success: false,
				message: "Person not found",
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
