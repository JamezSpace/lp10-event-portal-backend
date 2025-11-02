import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getRegistrationByRef } from "../controllers/registrations.controller";

export async function registrationPlugin(fastify: FastifyInstance, opts: any) {
	fastify.get(
		"/",
		async (
			request: FastifyRequest<{ Querystring: { ref: string } }>,
			reply: FastifyReply
		) => {
			const transaction_ref = request.query.ref;

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
}
