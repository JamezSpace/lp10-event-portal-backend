import { Collection, ObjectId } from "mongodb";
import { PaystackInit } from "../interfaces/paystack.interfaces";
import {mongo_client, redis_client} from "../utils/db.utils";
import { Payer } from "../interfaces/payer.interfaces";
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
			storePayersInformation(
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
            payers_id = await redis_client.get(`backend_payers_id:t_ref:${transaction_ref}`) 

        if(!payers_id) throw new Error("Payer's id doesn't exist in redis server!")

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
			const updated = await updatedPayersInformation(payers_id, {
				status: "verified",
			});            

			if (!updated) throw new Error("Payer not found for update!");

            // update person's paid for 'hasPaid' status
            const updatedPersons = await updatedPersonsThatPaid(transaction_ref, {
                hasPaid: true
            })

            if (!updatedPersons) throw new Error("Person paid for not found for update!");
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

const storePayersInformation = async (
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

		if (!created_payer.acknowledged) throw new Error("Payer wasn't saved to the database");
		else {
            // save the just stored payer's id in memory for verification that would happen almost immediately
            // implementation with redis
            const saved = await redis_client.setEx(`backend_payers_id:t_ref:${transaction_ref}`, 180, new String(created_payer.insertedId).toString());
            if(saved !== 'OK') throw new Error("Payer's ID wasn't saved to Redis")
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

const updatedPayersInformation = async (
	payers_id: string,
	payer: Partial<Payer>
) => {
	try {        
		const updatedPayer = await payers.updateOne(
			{ _id: new ObjectId(payers_id) },
			{ $set: payer}
		);

		if (!updatedPayer) throw new Error("Payer doesnt exist");

		return true;
	} catch (error) {
		console.error(error);

		return false;
	}
};

const updatedPersonsThatPaid = async (
	transaction_ref: string,
	update_to_make_on_person: Partial<Person>
) => {
    try {
        const updatedPersons = await persons.updateMany(
            { transaction_ref: transaction_ref },
            { $set: update_to_make_on_person }
        )

        if (!updatedPersons) throw new Error("A person/persons doesnt exist");

		return true;
    } catch (error) {
        console.error(error);

		return false;
    }
}

export { verifyFlutterwavePayment, initPaystackPayment, verifyPaystackPayment };
