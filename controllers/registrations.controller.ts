import { Collection } from "mongodb";
import client from "../utils/db.utils";

const payers: Collection = client.db().collection("payers");
const persons: Collection = client.db().collection("persons");

const getRegistrationByRef = async (transaction_reference: string) => {
	try {
		const result = await persons.aggregate([
			{
				$match: { transaction_ref: transaction_reference } // filter by transaction ref
			},
			{
				$lookup: {
					from: "payers",
					localField: "transaction_ref",
					foreignField: "transaction_ref",
					as: "payer"
				}
			},
			{
				$unwind: {
					path: "$payer",
					preserveNullAndEmptyArrays: true // keep person even if no payer
				}
			}
		]).toArray();

		return result;
	} catch (error: any) {
		console.error(error);
		throw new Error(error.message);
	}
};


export { getRegistrationByRef };
