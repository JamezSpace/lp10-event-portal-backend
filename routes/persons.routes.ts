import { Person } from "../interfaces/person.types";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	deletePerson,
	getAllPersons,
	getOnePerson,
	postPersons,
	putPerson,
	putPersons,
} from "../controllers/persons.controller";

export async function personsPlugin(fastify: FastifyInstance, opts: any) {
	// get all persons
	fastify.get("/", getAllPersons);

	// get a specific person
	fastify.get("/:id", getOnePerson);

	// add new person or persons
	const personSchema = {
		type: "object",
		required: [
			"first_name",
			"last_name",
			"email",
			"year_of_birth",
			"gender",
			"origin",
			"hasPaid",
		],
		properties: {
			first_name: { type: "string" },
			last_name: { type: "string" },
			email: { type: "string" },
			year_of_birth: { type: "number" },
			gender: { type: "string" },
			origin: { type: "string" },
			hasPaid: { type: "boolean" },
		},
	};
	fastify.post(
		"/",
		{
			schema: {
				body: {
					oneOf: [
						personSchema,
						{ type: "array", items: personSchema },
					],
				},
			},
		},
		postPersons
	);

	// delete a person
	fastify.delete("/:id", deletePerson);

	// edit a person
	fastify.put("/:id", putPerson);

	// edit persons
	fastify.put(
		"/",
		putPersons
	);

	// error handler specifically for post operation
	fastify.setErrorHandler(
		(error, request: FastifyRequest, response: FastifyReply) => {
			if (error.validation) {
				console.log(error.validation);

				return response.code(400).send({
					success: false,
                    message: 'Error in request validation',
					error: error.validation.filter(
						(error) => error.keyword === "required"
					)
						? "Necessary fields in the Request Data are missing!"
						: "Invalid request data",
				});
			}

			response
				.code(500)
				.send({
                    success: false,
					message: "Internal Server Error",
					error: error.message,
				});
		}
	);
}
