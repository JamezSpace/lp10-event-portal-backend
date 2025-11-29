import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getAllRegistrations, getRegistrationByRef, postAnEventRegistration, putAnEventRegistration } from "../controllers/registrations.controller";
import { event_registrations_schema } from "../interfaces/registration.types";
import { Type } from "@fastify/type-provider-typebox";

export async function registrationPlugin(fastify: FastifyInstance, opts: any) {

    fastify.get('/', getAllRegistrations)

    // get registration by transaction ref
	fastify.get(
		"/ref/:ref",
		async (
			request: FastifyRequest<{ Params: { ref: string } }>,
			reply: FastifyReply
		) => {
			const transaction_ref = request.params.ref;

			if (!transaction_ref || transaction_ref === "")
				return reply.code(400).send({
					success: false,
					message: "Error in request validation",
					error: "Transaction reference not attached!",
				});

			try {
				const registration_details_filtered_by_transaction_ref =
					await getRegistrationByRef(transaction_ref);

				return reply.code(200).send({
					success: true,
					message: "Search Successful",
					data: registration_details_filtered_by_transaction_ref,
				});
			} catch (error: any) {
				return reply.code(500).send({
					success: false,
					message: "Internal Server Error",
					error: error.message,
				});
			}
		}
	);

    fastify.post('/', {schema: {body: event_registrations_schema}}, postAnEventRegistration)

    fastify.put('/', {schema: {body: Type.Partial(event_registrations_schema)}}, putAnEventRegistration)
}
