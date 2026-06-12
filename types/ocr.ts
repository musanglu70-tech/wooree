export interface OcrPrescriptionItem {
  code: string;
  name: string;
  quantity: number;
  amount: number;
}

export interface OcrPrescriptionResult {
  hospitalName: string;
  doctorName: string;
  prescriptionDate: string;
  patientName: string;
  rawText: string;
  items: OcrPrescriptionItem[];
}
