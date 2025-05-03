import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { deletePerson, getAllPersons, getOnePerson, postPerson, putPerson } from "../controllers/persons.controller";

export async function personsPlugin(fastify: FastifyInstance, opts: any) {
    // get all persons
    fastify.get('/', getAllPersons)

    // get a specific person
    fastify.get('/:id', getOnePerson);

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
    }, postPerson)

    // delete a person
    fastify.delete('/:id', deletePerson);

    // edit a person
    fastify.put('/:id', putPerson);

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