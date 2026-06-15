export interface OcrPrescriptionItem {
  code: string;
  name: string;
  quantity: number;
  amount: number;
  unitPrice: number;
  totalUsage: number;
  totalAmount: number;
  unit: string;
  prescriptionCount: number;
}

export interface OcrPrescriptionResult {
  hospitalName: string;
  doctorName: string;
  prescriptionDate: string;
  patientName: string;
  pharmaCompanyName: string;
  businessNumber: string;
  rawText: string;
  items: OcrPrescriptionItem[];
}
