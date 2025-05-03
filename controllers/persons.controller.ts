import { FastifyReply, FastifyRequest } from "fastify";
import { Collection, InsertManyResult, ObjectId } from "mongodb";
import { Person } from "../interfaces/person.interfaces";
import client from "../utils/db.utils";

const persons: Collection = client.db().collection("persons");

// GET all
const getAllPersons = async (_request: FastifyRequest, response: FastifyReply) => {
    try {
        const result = await persons.find().toArray()

        return response.code(200).send(result)
    } catch (error: any) {
        return response.code(500).send({
            message: 'Internal server error',
            error: error.message
        })
    }
}

//GET one
const getOnePerson = async (request: FastifyRequest<{ Params: { id: string } }>, response: FastifyReply) => {
    try {
        const { id } = request.params;

        if (!ObjectId.isValid(id)) {
            return response.code(400).send({ error: "Invalid ID format" });
        }

        const person = await persons.findOne({ _id: new ObjectId(id) });

        if (!person) {
            return response.code(404).send({ error: "Person not found" });
        }

        return response.code(200).send(person);

    } catch (error: any) {
        return response.code(500).send({
            message: "Internal server error",
            error: error.message
        });
    }
}

// POST person or persons
const postPerson = async (request: FastifyRequest<{ Body: Person | Person[] }>, response: FastifyReply) => {
    let resultMany: InsertManyResult<Document>

    // Determine if the request body is an array or a single object
    if (Array.isArray(request.body)) {
        resultMany = await persons.insertMany(request.body);

        if (!resultMany.acknowledged) throw new Error("Names Not Saved!");
        return response.code(201).send({
            message: `${resultMany.insertedCount} Insert Successful!`,
            ids: resultMany.insertedIds
        });
    }

    const result = await persons.insertOne(request.body)

    if (!result.acknowledged) throw new Error("Names Not Saved!");
    return response.code(201).send({
        message: `Insert Successful!`,
        ids: result.insertedId
    });
}

// PUT person
const putPerson = async (request: FastifyRequest<{ Params: { id: string }, Body: Partial<Person> }>,
    response: FastifyReply) => {
    try {
        const { id } = request.params;
        const updates = request.body;

        if (!ObjectId.isValid(id)) {
            return response.code(400).send({ error: "Invalid ID format" });
        }

        const result = await persons.updateOne({ _id: new ObjectId(id) }, { $set: updates });

        if (result.matchedCount === 0) {
            return response.code(404).send({ error: "Person not found" });
        }

        return response.code(200).send({ message: "Person updated successfully!" });

    } catch (error: any) {
        return response.code(500).send({
            message: "Internal server error",
            error: error.message
        });
    }
}

// PUT persons
const putPersons = async (
    ids_array: string[],
    updates: object
) => {
    try {
        if (!Array.isArray(ids_array) || ids_array.some(i => !ObjectId.isValid(i))) {
            return {
                message: "unsuccessful",
                reason: "invalid ids!"
            };
        }

        const objectIds = ids_array.map(i => new ObjectId(i));

        const result = await persons.updateMany({ _id: { $in: objectIds } }, { $set: updates });

        if (result.matchedCount === 0) {
            return {
                message: "unsuccessful",
                reason: "persons not found!"
            };
        }

        return {
            message: "successful",
            modifiedCount: result.modifiedCount
        };

    } catch (error: any) {
        return {
            message: "unsuccessful",
            error: error.message
        };
    }
};


// DELETE person
const deletePerson = async (request: FastifyRequest<{ Params: { id: string } }>,
    response: FastifyReply) => {
    try {
        const { id } = request.params;
        if (!ObjectId.isValid(id)) {
            return response.code(400).send({ error: "Invalid ID format" });
        }

        const result = await persons.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return response.code(404).send({ error: "Person not found" });
        }

        return response.code(200).send({ message: "Person deleted successfully!" });

    } catch (error: any) {
        return response.code(500).send({
            message: "Internal server error",
            error: error.message
        });
    }
}

export {
    deletePerson, getAllPersons,
    getOnePerson,
    postPerson,
    putPerson,
    putPersons
};

