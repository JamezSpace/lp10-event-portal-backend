const verfiyPayment = async (transaction_id: number) => {
    try {
        const flutter_response = await fetch(`https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`, {
            headers: {
                Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`
            }
        })

        const data = await flutter_response.json();
        console.log(data);

        if (data.status === 'success' && data.data.status === 'successful') {
            // Payment was successful
            // You can also check:
            // data.data.amount === expected_amount
            // data.data.currency === 'NGN'
            return {
                status: 'valid',
                paymentData: data.data,
            };
        } else {
            return {
                status: 'invalid',
                reason: 'Payment not successful',
            };
        }

    } catch (error: any) {
        console.error('Error verifying payment:', error.response?.data || error.message);
        return {
            status: 'error',
            reason: error.response?.data || error.message,
        };
    }
}

export {
    verfiyPayment
}