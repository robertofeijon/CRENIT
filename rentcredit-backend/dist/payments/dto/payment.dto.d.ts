export declare class CreatePaymentDto {
    propertyId: string;
    amount: number;
    dueDate: string;
    notes?: string;
}
export declare class UpdatePaymentStatusDto {
    status: string;
    notes?: string;
}
export declare class RecordPaymentDto {
    amount: number;
    receiptUrl?: string;
    notes?: string;
}
