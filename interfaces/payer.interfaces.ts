export interface Payer {
    id: number;
    name: string;
    email: string;
    expected_amount: number;
    transaction_ref: string;
    status: string; // ['pending', 'verified']
    created_at: Date | string;
    processed_at: Date | string;
}