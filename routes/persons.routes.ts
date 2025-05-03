import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { Collection, InsertManyResult, InsertOneResult, ObjectId } from "mongodb";
import client from "../utils/db.utils";
import { Person } from "../interfaces/person.interfaces";

const persons: Collection = client.db().collection("persons");

export async function personsPlugin(fastify: FastifyInstance, opts: any) {
    // get all persons
    fastify.get('/', async (_request: FastifyRequest, response: FastifyReply) => {
        try {
            const result = await persons.find().toArray()

            return response.code(200).send(result)
        } catch (error: any) {
            return response.code(500).send({
                message: 'Internal server error',
                error: error.message
            })
        }
    })

    // get a specific person
    fastify.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, response: FastifyReply) => {
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
    });


    // add a new person
    const personSchema = {
        type: "object",
        required: ["first_name", "last_name", "email", "year_of_birth", "gender", "origin", "hasPaid"],
        properties: {
            first_name: { type: "string" },
            last_name: { type: "string" },
            email: { type: "string" },
            year_of_birth: { type: "number" },
            gender: { type: "string" },
            origin: { type: "string" },
            hasPaid: { type: "boolean" }
        }
    };
    fastify.post('/', {
        schema: { body: { oneOf: [personSchema, { type: "array", items: personSchema }] } }
    }, async (request: FastifyRequest<{ Body: Person | Person[] }>, response: FastifyReply) => {
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
    })

    // delete a person
    fastify.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>,
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
    });

    // edit a person
    fastify.put('/:id', async (request: FastifyRequest<{ Params: { id: string }, Body: Partial<Person> }>,
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
    });

    // error handler specifically for post operation
    fastify.setErrorHandler((error, request: FastifyRequest, response: FastifyReply) => {
        if (error.validation) {
            console.log(error.validation);

            return response.code(400).send({
                status: "error",
                message: error.validation.filter(error => error.keyword === 'required') ? 
                        "Necessary fields in the Request Data are missing!" : "Invalid request data"
            });
        }

        response.code(500).send({ message: "Internal Server Error", error: error.message });
    });
}