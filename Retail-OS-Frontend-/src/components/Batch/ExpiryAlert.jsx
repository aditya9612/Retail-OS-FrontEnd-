import React from "react";

const ExpiryAlert = ({ batches }) => {

    const today = new Date();

    const alerts = batches.filter((batch) => {

        if (!batch.expiryDate) return false;

        const expiry = new Date(batch.expiryDate);

        const diffDays = Math.ceil(
            (expiry - today) / (1000 * 60 * 60 * 24)
        );

        return diffDays <= 30;

    });

    return (

        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">

            <h3 className="text-xl font-black text-slate-800 mb-6">
                Expiry Alerts
            </h3>

            {
                alerts.length === 0 ? (

                    <p className="text-green-600 font-bold">
                        ✅ No products nearing expiry.
                    </p>

                ) : (

                    alerts.map((batch, index) => {

                        const expiry = new Date(batch.expiryDate);

                        const diffDays = Math.ceil(
                            (expiry - today) / (1000 * 60 * 60 * 24)
                        );

                        return (

                            <div
                                key={index}
                                className="
                                    mb-4
                                    p-4
                                    rounded-xl
                                    bg-red-50
                                    border
                                    border-red-200
                                "
                            >

                                <p className="font-black text-red-700">
                                    Batch: {batch.batchNo}
                                </p>

                                <p className="text-sm text-red-600">

                                    {
                                        diffDays < 0
                                            ? "Expired"
                                            : `Expires in ${diffDays} day(s)`
                                    }

                                </p>

                            </div>

                        );

                    })

                )
            }

        </div>

    );

};

export default ExpiryAlert;