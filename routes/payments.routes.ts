import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	initCredoPayment,
	initPaystackPayment,
	verifyCredoPayment,
	verifyPaystackPayment,
} from "../controllers/payments.controller";
import {
	credo_payment_schema,
	CredoPaymentBody,
	payment_schema,
	PaymentBody,
} from "../interfaces/payments.types";
import { createHash, createHmac } from "crypto";

export async function paymentPlugin(fastify: FastifyInstance, opts: any) {
	// verify flutterwave payment
	// fastify.post(
	// 	"/verify/:transaction_id",
	// 	async (
	// 		request: FastifyRequest<{
	// 			Params: { transaction_id: number };
	// 			Body: { amount: number; ids: string[] };
	// 		}>,
	// 		response: FastifyReply
	// 	) => {
	// 		const { transaction_id } = request.params;
	// 		const { amount, ids } = request.body;

	// 		const result = await verifyFlutterwavePayment(transaction_id);

	// 		if (result.status === "valid") {
	// 			// Extra validation
	// 			if (
	// 				result.paymentData.amount !== amount ||
	// 				result.paymentData.currency !== "NGN"
	// 			) {
	// 				return response.code(400).send({
	// 					status: "invalid",
	// 					message: "Amount or currency mismatch",
	// 				});
	// 			}

	// 			// Mark persons as paid
	// 			const updatedPerson = await markPersonsAsPaid(ids);

	// 			if (!updatedPerson) {
	// 				return response
	// 					.code(404)
	// 					.send({ status: "error", message: "User not found" });
	// 			}

	// 			return response.code(200).send({
	// 				status: "valid",
	// 				payment: result.paymentData,
	// 				user: updatedPerson,
	// 			});
	// 		}
	// 	}
	// );

	// init paystack payment
	fastify.post(
		"/paystack",
		{ schema: { body: payment_schema } },
		async (
			request: FastifyRequest<{ Body: PaymentBody }>,
			reply: FastifyReply
		) => {
			try {
				const paystack_response = await initPaystackPayment(
					request.body.name,
					request.body.email,
					request.body.amount
				);

				// send auth url to frontend for paystack checkout
				reply.code(200).send({
					success: true,
					message: "Paystack transaction initialized successfully",
					data: paystack_response,
				});
			} catch (error: any) {
				reply.code(500).send({
					success: false,
					message: "Internal Server Error",
					error: error.message,
				});
			}
		}
	);

	// verify paystack payment
	fastify.get(
		"/paystack/verify",
		async (
			request: FastifyRequest<{ Querystring: { reference: string } }>,
			reply: FastifyReply
		) => {
			try {
				if (!request.query.reference)
					return reply
						.code(400)
						.send({ success: false, message: "Missing reference" });

				const verification = await verifyPaystackPayment(
					request.query.reference
				);

				// user either didn't pay eventually or abandoned payment
				if (verification.status !== "success") {
					return reply.redirect(
						`${process.env.FRONTEND_URL}/payment-status?status=failed`
					);
					// return reply.code(200).send({
					// 	success: false,
					// 	message: `Payment ${verification.status}`,
					// 	data: {
					// 		created_at: verification.created_at,
					// 	},
					// });
				}

				return reply.redirect(
					`${process.env.FRONTEND_URL}/payment-status?status=success&ref=${request.query.reference}`
				);
				// return reply.code(200).send({
				// 	success: true,
				// 	message: "Payment Complete",
				// 	data: verification,
				// });
			} catch (error: any) {
				console.error(error);

				reply.code(500).send({
					success: false,
					message: "Internal error during verification",
					error: error.message,
				});
			}
		}
	);

	// webhook for paystack backend-backend operation
	fastify.post(
		"/webhooks/paystack",
		async (
			request: FastifyRequest<{ Body: { event: string; data: any } }>,
			reply: FastifyReply
		) => {
			try {
				// retrieve Paystack signature header
				const paystackSignature = request.headers[
					"x-paystack-signature"
				] as string;
				if (!paystackSignature) {
					return reply
						.code(401)
						.send({ success: false, message: "Missing signature" });
				}

				// verify signature ensuring request is truly from paystack
				const secret = process.env.PAYSTACK_SECRET_KEY!;
				const hash = createHmac("sha512", secret)
					.update(JSON.stringify(request.body))
					.digest("hex");

				const signature = request.headers["x-paystack-signature"];

				if (hash !== signature) {
					return reply
						.code(401)
						.send({ success: false, message: "Invalid signature" });
				}

				// get event = "charge.success"
				const event = request.body.event;
				const data = request.body.data;

				if (event === "charge.success") {
					const reference = data.reference;

					// Reusing my verifyPaystackPayment logic
					const verification = await verifyPaystackPayment(reference);

					if (
						verification.status === "success" &&
						verification.valid
					) {
						console.log(
							`Payment verified via webhook for reference: ${reference}`
						);
					} else {
						console.warn(
							`Payment webhook received but invalid: ${reference}`
						);
					}
				} else {
					console.log(`Ignored Paystack event: ${event}`);
				}

				return reply.code(200).send({ success: true });
			} catch (error: any) {
				console.error("Webhook error:", error);
				return reply
					.code(500)
					.send({ success: false, message: error.message });
			}
		}
	);

	// init credo payment
	fastify.post(
		"/credo",
		{ schema: { body: credo_payment_schema } },
		async (
			request: FastifyRequest<{ Body: CredoPaymentBody }>,
			reply: FastifyReply
		) => {
			try {
				const { last_name, email, amount, event_id, payment_for } =
					request.body;

				const credo_response = await initCredoPayment(
					last_name,
					email,
					amount,
					event_id,
					payment_for
				);

				// send auth url to frontend for credo checkout
				reply.code(200).send({
					success: true,
					message: "Credo transaction initialized successfully",
					data: credo_response,
				});
			} catch (error: any) {
				reply.code(500).send({
					success: false,
					message: "Internal Server Error",
					error: error.message,
				});
			}
		}
	);

	// verify credo payment
	fastify.get(
		"/credo/verify",
		async (
			request: FastifyRequest<{ Querystring: { transRef: string } }>,
			reply: FastifyReply
		) => {
			try {
				if (!request.query.transRef)
					return reply
						.code(400)
						.send({ success: false, message: "Missing reference" });

				const verification = await verifyCredoPayment(
					request.query.transRef
				);

                console.log("Verification: ", verification);
                
				// user either didn't pay eventually or abandoned payment
				if (verification.status !== "success") {
					return reply.redirect(
						`${process.env.FRONTEND_URL}/payment-status?status=failed`
					);
					// return reply.code(200).send({
					// 	success: false,
					// 	message: `Payment ${verification.status}`,
					// 	data: {
					// 		created_at: verification.created_at,
					// 	},
					// });
				}

				return reply.redirect(
					`${process.env.FRONTEND_URL}/payment-status?status=success&ref=${request.query.transRef}`
				);
				// return reply.code(200).send({
				// 	success: true,
				// 	message: "Payment Complete",
				// 	data: verification,
				// });
			} catch (error: any) {
				console.error(error);

				reply.code(500).send({
					success: false,
					message: "Internal error during verification",
					error: error.message,
				});
			}
		}
	);

	// webhook for credo backend-backend operation
	fastify.post(
		"/webhooks/credo",
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				// 1. Get Credo signature from headers
				const credoSignature = request.headers[
					"x-credo-signature"
				] as string;
				if (!credoSignature) {
					return reply.code(401).send({
						success: false,
						message: "Missing Credo signature",
					});
				}

				// 2. Construct signed content: Token + BusinessCode
				const TOKEN = process.env.CREDO_WEBHOOK_TOKEN!;
				const BUSINESS_CODE = process.env.CREDO_BUSINESS_CODE!;

				if (!TOKEN || !BUSINESS_CODE) {
					console.error("Credo webhook env variables missing");
					return reply.code(500).send({
						success: false,
						message: "Server misconfigured for Credo webhook",
					});
				}

				const signedContent = `${TOKEN}${BUSINESS_CODE}`;

				// 3. Hash using SHA512
				const expectedSignature = createHash("sha512")
					.update(signedContent)
					.digest("hex");

				// 4. Compare signatures
				if (expectedSignature !== credoSignature) {
					console.warn("Invalid signature from Credo");
					return reply.code(401).send({
						success: false,
						message: "Invalid signature",
					});
				}

				// 5. Extract event and data
				const { event, data } = request.body as any;

				console.log("Credo webhook event received:", event);

				// 6. Handle only actual payment success events
				if (event === "transaction.successful") {
					const transRef = data?.transRef;
					const amount = data?.transAmount;
					const customerEmail = data?.customer?.customerEmail;

					console.log("Verified Payment:", {
						transRef,
						amount,
						customerEmail,
					});

					// 👉 TODO: Mark order as paid, update DB, send emails, etc.
				}

				return reply.code(200).send({ success: true });
			} catch (err: any) {
				console.error("Credo webhook error:", err);
				return reply.code(500).send({
					success: false,
					message: err.message,
				});
			}
		}
	);
}
