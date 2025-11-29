import { Collection, ObjectId } from "mongodb";
import { PaystackInit } from "../interfaces/paystack.interfaces";
import { mongo_client, redis_client } from "../utils/db.utils";
import { Payer } from "../interfaces/payer.interfaces";
import { CredoInit } from "../interfaces/credo.interfaces";
import { EventRegistration } from "../interfaces/registration.types";
import { Person } from "../interfaces/person.types";

const verifyFlutterwavePayment = async (transaction_id: number) => {
	try {
		const flutter_response = await fetch(
			`https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
			{
				headers: {
					Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
				},
			}
		);

		const data = await flutter_response.json();
		console.log(data);

		if (data.status === "success" && data.data.status === "successful") {
			// Payment was successful
			// You can also check:
			// data.data.amount === expected_amount
			// data.data.currency === 'NGN'
			return {
				status: "valid",
				paymentData: data.data,
			};
		} else {
			return {
				status: "invalid",
				reason: "Payment not successful",
			};
		}
	} catch (error: any) {
		console.error(
			"Error verifying payment:",
			error.response?.data || error.message
		);
		return {
			status: "error",
			reason: error.response?.data || error.message,
		};
	}
};

// UPDATE controller function with accordance to the new db design
const initPaystackPayment = async (
	name: string,
	email: string,
	amount: number
): Promise<PaystackInit> => {
	const params = {
		email,
		amount: amount * 100, // converting to kobo
		callback_url: `${process.env.HOST_URL}/payments/paystack/verify`,
	};

	// cleaned paystack sync implementation (https) to async method (fetch)
	try {
		const response = await fetch(
			"https://api.paystack.co/transaction/initialize",
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(params),
			}
		);

		const paystack_response = await response.json();

		// store payers information
		try {
			storePayersInformation_paystack(
				name,
				email,
				amount * 100,
				paystack_response.data.reference
			);
		} catch (error: any) {
			throw new Error(error.messsage);
		}

		return paystack_response;
	} catch (error: any) {
		console.error(error);

		throw new Error(error.message);
	}
};

const verifyPaystackPayment = async (transaction_ref: string) => {
	// cleaned paystack sync implementation (https) to async method (fetch)
	try {
		const response = await fetch(
			`https://api.paystack.co/transaction/verify/${transaction_ref}`,
			{
				method: "GET",
				headers: {
					Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
					"Content-Type": "application/json",
				},
			}
		);

		const paystack_response = await response.json(),
			// fetch payers id from in memory db (redis)
			payers_id = await redis_client.get(
				`backend_payers_id:t_ref:${transaction_ref}`
			);

		if (!payers_id)
			throw new Error("Payer's id doesn't exist in redis server!");

		const payer = await retrievePayersInformation(payers_id);
		if (!payer) throw new Error("Payer not found (undefined)");

		const necessary_payment_details = {
			amount_to_pay: payer.expected_amount,
			amount_paid: paystack_response.data.amount,
			receipt_number: paystack_response.data.receipt_number,
			paid_at: paystack_response.data.paid_at,
			created_at: paystack_response.data.created_at,
			channel: paystack_response.data.channel,
		};

		// verify transaction status
		if (paystack_response.data.status !== "success") {
			// delete users with transaction_ref
			await deleteUsersByTransactionRef(transaction_ref);

			return {
				...necessary_payment_details,
				status: paystack_response.data.status,
				valid: false,
				message: "user didn't complete transaction",
			};
		}

		// verify if amount paid matches
		if (paystack_response.data.amount < payer.expected_amount)
			return {
				...necessary_payment_details,
				status: "success",
				valid: false,
				message: "amount paid is lesser than required amount",
			};

		// ensures idempotency (payment not processed twice)
		if (payer.status !== "verified") {
			// update payer's status
			const updated = await updatePayersInformation(payers_id, {
				status: "verified",
			});

			if (!updated) throw new Error("Payer not found for update!");

			// update person's paid for 'hasPaid' status
			const updatedPersons = await updatedPersonsThatPaid(
				transaction_ref,
				{
					// hasPaid: true,
				}
			);

			if (!updatedPersons)
				throw new Error("Person paid for not found for update!");
		}

		return {
			...necessary_payment_details,
			status: "success",
			valid: true,
			message: "successful payment",
		};
	} catch (error: any) {
		console.error(error);

		throw new Error(error.message);
	}
};

const initCredoPayment = async (
	name: string,
	email: string,
	amount: number,
	event_id: string,
	payment_for: string[]
): Promise<CredoInit> => {
	// credo gateway params
	const params = {
		email,
		amount: amount * 100,
		channels: ["card", "bank"],
		callback_url: `${process.env.HOST_URL}/hi-change-this`,
	};

	// save payers and event registration information to db
	const db_insert_response = await storePayersAndRegistrationInformation(
		{
			payers_name: name,
			payers_email: email,
			expected_amount: amount,
			event_id,
			paid_for: payment_for,
		},
		{
			event_id,
			payment_for,
		}
	);

	if (
		typeof db_insert_response === "undefined" ||
		!db_insert_response.success || !db_insert_response.payer_id || !db_insert_response.registration_ids
	) {
		throw new Error("Couldn't save payers and registration detials");
	}

	// api call to credo server
	try {
		const response = await fetch(
			`${process.env.CREDO_BASE_API_URL}/transaction/initialize`,
			{
				method: "POST",
				headers: {
					Authorization: `${process.env.CREDO_SECRET_KEY}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(params),
			}
		);

		const credo_response = await response.json();
		const transaction_ref = credo_response.data.reference;

		// update stored values in payers and registrations docs with transaction reference gotten from the prior api call
		const update_status = await updatePayersAndRegistrationInformation(
			transaction_ref,
			db_insert_response.payer_id,
			db_insert_response.registration_ids
		);

		if (typeof update_status === "undefined" || !update_status.success)
			throw new Error("Update transaction reference failed!");

		// for further verification, save the just added payer_id to redis cache to tackle with issues where user closes or interrupts payment flow mid-way or server discrepancies
		const saved_payer = await redis_client.setEx(
			`backend_payers_id:t_ref:${transaction_ref}`,
			180,
			db_insert_response.payer_id.toString()
		);

		if (saved_payer !== "OK")
			throw new Error("Failed storing payer in Redis");

		return credo_response;
	} catch (error: any) {
		console.error(error);

		throw new Error(error.message);
	}
};

const verifyCredoPayment = async (transaction_ref: string) => {
	try {
		// api call to verify payment
		const response = await fetch(
			`${process.env.CREDO_BASE_API_URL}/transactions/${transaction_ref}/verify`,
			{
				method: "GET",
				headers: {
					Authorization: `Bearer ${process.env.CREDO_SECRET_KEY}`,
					"Content-Type": "application/json",
				},
			}
		);

		const credo_response = await response.json(),
			// fetch payers id from in-memory db (redis server)
			payers_id = await redis_client.get(
				`backend_payers_id:t_ref:${transaction_ref}`
			);

		if (!payers_id)
			throw new Error("Payer's id doesn't exist in redis server!");

		const payer = await retrievePayersInformation(payers_id);
		if (!payer) throw new Error("Payer not found (undefined)");

		const necessary_payment_details = {
			amount_to_pay: payer.expected_amount,
			amount_paid: credo_response.data.transAmount,
			debited_amount: credo_response.data.debitedAmount,
			transaction_fee: credo_response.data.transFeeAmount,
			receipt_number: credo_response.data.businessRef,
			credo_transaction_ref: credo_response.data.transRef,
			paid_at: credo_response.data.transactionDate,
			channel: credo_response.data.channelId,
			currency: credo_response.data.currencyCode,
		};

		// verify transaction status
		if (credo_response.data.status !== 200) {
			// flag all registrations attached to the payer as 'cancelled'
			await registrations.updateMany(
				{ payer_id: new ObjectId(payers_id) },
				{ $set: { status: "cancelled" } }
			);

			return {
				...necessary_payment_details,
				status: credo_response.data.status,
				valid: false,
				message: "user didn't complete transaction",
			};
		}

		// verify if amount paid matches
		if (credo_response.data.amount < payer.expected_amount)
			return {
				...necessary_payment_details,
				status: "success",
				valid: false,
				message: "amount paid is lesser than required amount",
			};

		// ensures idempotency (payment not processed twice)
		if (payer.status !== "verified") {
			// update payer's status
			const updated = await updatePayersInformation(payers_id, {
				status: "verified",
			});

			// update all registrations status
			const updated_regs = await updateRegistrations(payers_id, {
				status: "paid",
			});

			if (!updated) throw new Error("Payer not found for update!");
			if (!updated_regs) throw new Error("Registration not updated!");
		}

		return {
			...necessary_payment_details,
			status: "success",
			valid: true,
			message: "successful payment",
		};
	} catch (error: any) {
		console.error(error);

		throw new Error(error.message);
	}
};

const payers: Collection = mongo_client.db().collection("payers");
const persons: Collection = mongo_client.db().collection("persons");
const registrations: Collection = mongo_client.db().collection("registrations");
const payments: Collection = mongo_client.db().collection("payments");

const storePayersAndRegistrationInformation = async (
	payer_data: {
		payers_name: string;
		payers_email: string;
		expected_amount: number;
		event_id: string;
		paid_for: string[];
	},
	registration_docs: { event_id: string; payment_for: string[] },
	transaction_ref = "not generated yet"
): Promise<
	| {
			success: boolean;
			payer_id?: ObjectId;
			registration_ids?: ObjectId[];
			error?: any;
	  }
	| undefined
> => {
	const session = mongo_client.startSession();

	try {
		let payer_id!: ObjectId, reg_ids!: ObjectId[];

		await session.withTransaction(async () => {
			// insert payer and save the payer's id in-memory
			const payers_response = await payers.insertOne(
				{
					...payer_data,
					transaction_ref,
					created_at: Date.now(),
					status: "pending",
				},
				{ session }
			);

			if (!payers_response.acknowledged)
				throw new Error("Failed to insert payer");

			payer_id = payers_response.insertedId;

			// 2. insert event registrations
			const time_now = Date.now();
			const reg_details = registration_docs.payment_for.map(
				(person_id) => {
					return {
						event_id: registration_docs.event_id,
						person_id,
						transaction_ref,
						created_at: time_now,
					};
				}
			);

			const reg_response = await registrations.insertMany(reg_details, {
				session,
			});

			if (!reg_response.acknowledged)
				throw new Error("Failed to insert registrations");

			reg_ids = Object.values(reg_response.insertedIds);
		});

		return {
			success: true,
			payer_id,
			registration_ids: reg_ids,
		};
	} catch (error: any) {
		console.error(
			"Transaction error in storing transaction reference in payers and registration documents",
			error
		);

		return {
			success: false,
			error: error.message,
		};
	} finally {
		await session.endSession();
	}
};

const updatePayersAndRegistrationInformation = async (
	transaction_ref: string,
	payers_id: ObjectId,
	registration_ids: ObjectId[]
): Promise<{ success: boolean; error?: any } | undefined> => {
	const session = mongo_client.startSession();

	try {
		await session.withTransaction(async () => {
			// update payer's record with the new transaction_ref
			const updatedPayer = await payers.updateOne(
				{ _id: new ObjectId(payers_id) },
				{ $set: { transaction_ref } },
				{ session }
			);

			if (updatedPayer.matchedCount === 0)
				throw new Error("Payer does not exist");

			// update all registrations linked to this payer
			const updatedRegistrations = await registrations.updateMany(
				{ _id: { $in: registration_ids } },
				{ $set: { transaction_ref } },
				{ session }
			);

			if (updatedRegistrations.matchedCount === 0)
				throw new Error("No registrations found to update");

			return { success: true };
		});
	} catch (error: any) {
		console.error(
			"Transaction error in updating transaction reference in payers and registration documents:",
			error
		);
		return { success: false, error: error.message };
	} finally {
		await session.endSession();
	}
};

// TODO: According to new db design, remove this and use 'storePayersAndRegistrationInformation' function instead
const storePayersInformation_paystack = async (
	payers_name: string,
	payers_email: string,
	amount: number,
	transaction_ref: string
) => {
	try {
		const created_payer = await payers.insertOne({
			name: payers_name,
			email: payers_email,
			created_at: Date.now(),
			expected_amount: amount,
			transaction_ref,
			status: "pending",
		});

		if (!created_payer.acknowledged)
			throw new Error("Payer wasn't saved to the database");
		else {
			// save the just stored payer's id in memory for verification that would happen almost immediately
			// implementation with redis
			const saved = await redis_client.setEx(
				`backend_payers_id:t_ref:${transaction_ref}`,
				180,
				new String(created_payer.insertedId).toString()
			);
			if (saved !== "OK")
				throw new Error("Payer's ID wasn't saved to Redis");
		}

		return true;
	} catch (error) {
		console.error(error);

		return false;
	}
};

const retrievePayersInformation = async (payers_id: string) => {
	try {
		const payer = await payers.findOne({
			_id: new ObjectId(payers_id),
		});

		if (!payer) throw new Error("Payer doesnt exist");

		return payer;
	} catch (error) {
		console.error(error);
	}
};

const updatePayersInformation = async (
	payers_id: string,
	payer: Partial<Payer>
) => {
	try {
		const updatedPayer = await payers.updateOne(
			{ _id: new ObjectId(payers_id) },
			{ $set: payer }
		);

		if (!updatedPayer) throw new Error("Payer doesnt exist");

		return true;
	} catch (error) {
		console.error(error);

		return false;
	}
};

const updateRegistrations = async (
	payers_id: string,
	reg_to_set: Partial<EventRegistration>
) => {
	try {
		const updatedRegistrations = await registrations.updateMany(
			{ payer_id: new ObjectId(payers_id) },
			{ $set: reg_to_set }
		);

		if (!updatedRegistrations)
			throw new Error("Registrations doesnt exist");

		return true;
	} catch (error) {
		console.error(error);

		return false;
	}
};

// TODO: According to new db design, remove this
const updatedPersonsThatPaid = async (
	transaction_ref: string,
	update_to_make_on_person: Partial<Person>
) => {
	try {
		const updatedPersons = await persons.updateMany(
			{ transaction_ref: transaction_ref },
			{ $set: update_to_make_on_person }
		);

		if (!updatedPersons) throw new Error("A person/persons doesnt exist");

		return true;
	} catch (error) {
		console.error(error);

		return false;
	}
};

// TODO: According to new db design, remove this
const deleteUsersByTransactionRef = async (transaction_ref: string) => {
	try {
		const deletedPersons = await persons.deleteMany({
				transaction_ref: transaction_ref,
				hasPaid: false,
			}),
			deletedPayer = await payers.deleteOne({
				transaction_ref: transaction_ref,
			});

		console.log(
			`Number of persons with failed payment status deleted: ${deletedPersons.deletedCount}`
		);
		console.log("Payer for those person/persons deleted also");

		return true;
	} catch (error) {
		console.error(error);

		return false;
	}
};

export {
	verifyFlutterwavePayment,
	initPaystackPayment,
	verifyPaystackPayment,
	initCredoPayment,
	verifyCredoPayment,
};
