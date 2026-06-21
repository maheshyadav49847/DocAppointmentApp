import { useState, useEffect, useRef, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
// Removed unused framer-motion import
import { api } from "@/lib/axios"
import { useAuthStore } from "@/store/authStore"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import {
  ArrowLeft, Save, Activity, ClipboardList,
  HeartPulse, Edit, Trash2, X,
  FileText, User, Calendar, Droplets, Hash,
  Upload, Plus, Printer, Calendar as CalendarIcon, MessageSquare, Pencil
} from "lucide-react"
import MedicineAutocomplete from "./components/MedicineAutocomplete"
import PatientProfileDrawer from "../patients/components/PatientProfileDrawer"
import PrescriptionTemplate from "./components/PrescriptionTemplate"
import { generatePdfFromElement } from "../../utils/pdfUtils"

// Types
interface Medicine {
  medicineName: string
  medicineType?: string
  doseQty?: string
  doseSchedule?: string
  foodTiming?: string
  courseDuration?: string
  clinicalInstructions?: string
  dosage: string
}

interface ConsultationPageProps {
  patientId?: string;
  isEmbedded?: boolean;
  activeTokenId?: string;
}

export default function ConsultationPage({ patientId: propPatientId, isEmbedded = false, activeTokenId }: ConsultationPageProps = {}) {
  const { patientId: urlPatientId } = useParams()
  const patientId = propPatientId || urlPatientId
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { activeBranchId, user } = useAuthStore()

  const { data: branches } = useQuery({
    queryKey: ['branches', user?.orgId],
    queryFn: () => api.get(`/branches/org/${user?.orgId}`).then(r => r.data),
    enabled: !!user?.orgId
  })

  const currentBranchId = activeBranchId || user?.branchId || branches?.[0]?.id || "default"
  const currentBranch = branches?.find((b: any) => b.id === currentBranchId) || branches?.[0]

  // Queries
  const { data: patient, isLoading: isPatientLoading } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: async () => {
      const r = await api.get(`/patientclinical/${patientId}`)
      if (!r.data) throw new Error("Patient not found")
      return r.data
    },
  })

  const { data: doctors } = useQuery({
    queryKey: ["doctors"],
    queryFn: async () => {
      const r = await api.get("/doctors")
      return r.data
    },
  })

  // History Pagination
  const [historyPage, setHistoryPage] = useState(1)

  const { data: visitsData } = useQuery({
    queryKey: ["clinicalVisits", patientId, historyPage],
    queryFn: async () => {
      const r = await api.get(`/patientclinical/${patientId}/visits?page=${historyPage}&limit=5`)
      return r.data
    },
  })
  const visits = visitsData?.data || []
  const totalHistoryPages = visitsData?.totalPages || 1

  const { data: attachments } = useQuery({
    queryKey: ["attachments", patientId],
    queryFn: async () => {
      const r = await api.get(`/patientclinical/${patientId}/attachments?limit=100`)
      return r.data?.data || []
    },
  })

  const { data: medicineTypesData } = useQuery({
    queryKey: ["medicineTypes"],
    queryFn: async () => {
      const r = await api.get('/medicines/types')
      return r.data || []
    },
  })

  // State
  const [activeTab, setActiveTab] = useState<"history" | "attachments">("history")
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false)

  // Form State
  const [visitDoctorId, setVisitDoctorId] = useState(user?.doctorId || "")
  const [visitSymptoms, setVisitSymptoms] = useState("")
  const [visitDiagnosis, setVisitDiagnosis] = useState("")
  const [visitAdvice, setVisitAdvice] = useState("")
  const [visitInternalNotes, setVisitInternalNotes] = useState("")
  const [visitWeight, setVisitWeight] = useState("")
  const [visitTemperature, setVisitTemperature] = useState("")
  const [visitBloodPressure, setVisitBloodPressure] = useState("")
  const [visitHeartRate, setVisitHeartRate] = useState("")
  const [visitRespiratoryRate, setVisitRespiratoryRate] = useState("")
  const [visitOxygenLevel, setVisitOxygenLevel] = useState("")
  const [visitBloodSugar, setVisitBloodSugar] = useState("")
  const [visitMedicines, setVisitMedicines] = useState<Medicine[]>([])

  // Follow-up & Attachments state
  const [visitFollowUpDate, setVisitFollowUpDate] = useState("")
  const [visitFollowUpInstructions, setVisitFollowUpInstructions] = useState("")
  const [visitFiles, setVisitFiles] = useState<{ file: File, category: string }[]>([])
  const [stagingFile, setStagingFile] = useState<File | null>(null)
  const [stagingCategory, setStagingCategory] = useState("Lab Report")

  // Printing & WhatsApp state
  const [printingVisitId, setPrintingVisitId] = useState<string | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  // Historical Print State
  const [visitToPrint, setVisitToPrint] = useState<any>(null)
  const historicPrintRef = useRef<HTMLDivElement>(null)

  // Edit State
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null)
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false)

  // Med input state
  const [medName, setMedName] = useState("")
  const [medDosage, setMedDosage] = useState("") // mapped to doseQty
  const [medTiming, setMedTiming] = useState("") // mapped to foodTiming
  const [medDuration, setMedDuration] = useState("") // courseDuration
  const [medType, setMedType] = useState("Tablet") // medicineType
  const [medSchedule, setMedSchedule] = useState("") // doseSchedule
  const [medInstructions, setMedInstructions] = useState("") // clinicalInstructions

  const availableDoctors = useMemo(() => {
    if (!doctors) return [];
    if (user?.role === "Doctor") {
      return doctors.filter((d: any) => 
        (user.doctorId && String(d.id) === String(user.doctorId)) || 
        (d.emailId?.toLowerCase() === user.email?.toLowerCase())
      );
    }
    return doctors;
  }, [doctors, user]);

  // Auto-select doctor
  useEffect(() => {
    if (availableDoctors?.length > 0 && !visitDoctorId) {
      setVisitDoctorId(String(availableDoctors[0].id))
    }
  }, [availableDoctors, visitDoctorId])

  const deleteAttachmentMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/patientclinical/attachments/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attachments", patientId] })
      queryClient.invalidateQueries({ queryKey: ["clinicalVisits", patientId] })
    }
  })

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        doctorId: visitDoctorId,
        symptoms: visitSymptoms,
        diagnosis: visitDiagnosis,
        advice: visitAdvice,
        internalNotes: visitInternalNotes,
        weight: visitWeight ? parseFloat(visitWeight) : null,
        heartRate: visitHeartRate ? parseInt(visitHeartRate, 10) : null,
        bloodPressure: visitBloodPressure || null,
        oxygenLevel: visitOxygenLevel ? parseFloat(visitOxygenLevel) : null,
        temperature: visitTemperature ? parseFloat(visitTemperature) : null,
        respiratoryRate: visitRespiratoryRate ? parseInt(visitRespiratoryRate, 10) : null,
        bloodSugar: visitBloodSugar ? parseFloat(visitBloodSugar) : null,
        followUpDate: visitFollowUpDate ? new Date(visitFollowUpDate).toISOString() : null,
        followUpInstructions: visitFollowUpInstructions || null,
        tokenId: activeTokenId || undefined,
        medicines: visitMedicines.map((m) => ({
          medicineName: m.medicineName,
          dosage: m.dosage || "",
          medicineType: m.medicineType || "Tablet",
          doseQty: m.doseQty || "",
          doseSchedule: m.doseSchedule || "",
          foodTiming: m.foodTiming || "",
          courseDuration: m.courseDuration || "",
          clinicalInstructions: m.clinicalInstructions || ""
        })),
      }

      let res;
      if (editingVisitId) {
        res = await api.put(`/patientclinical/visits/${editingVisitId}`, payload)
      } else {
        res = await api.post(`/patientclinical/${patientId}/visits`, payload)
      }

      // Upload files
      if (visitFiles.length > 0) {
        for (const item of visitFiles) {
          const formData = new FormData()
          formData.append("file", item.file)
          formData.append("category", item.category)
          formData.append("patientVisitId", res.data.id)
          await api.post(`/patientclinical/${patientId}/attachments`, formData)
        }
      }

      return res.data
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["clinicalVisits", patientId] })
      queryClient.invalidateQueries({ queryKey: ["attachments", patientId] })

      // We must generate the PDF BEFORE clearing the form, otherwise the PDF will be empty
      if (printRef.current) {
        try {
          const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true, logging: false });
          const imgData = canvas.toDataURL("image/png");
          const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          let imgWidth = pdfWidth;
          let imgHeight = (canvas.height * pdfWidth) / canvas.width;
          if (imgHeight > pageHeight) {
            const ratio = pageHeight / imgHeight;
            imgHeight = pageHeight;
            imgWidth = imgWidth * ratio;
          }
          const x = (pdfWidth - imgWidth) / 2;
          pdf.addImage(imgData, "PNG", x, 0, imgWidth, imgHeight);

          const base64Pdf = pdf.output("datauristring").split(",")[1];
          await api.post("/whatsapp/bridge/send", {
            branchId: currentBranchId,
            to: patient?.phone,
            message: `Hello ${patient?.name}, here is your prescription from your recent consultation at Modern Clinic.`,
            fileBase64: base64Pdf,
            fileName: `Prescription_${patient?.name}.pdf`
          });
          alert("Consultation saved and Prescription sent to WhatsApp!");
        } catch (err: any) {
          console.error("Auto-send WA Error", err);
          if (err.response?.status === 409) {
            alert("Consultation saved, but WhatsApp is not connected for this branch. Please scan the QR code in WhatsApp Settings first.");
          } else {
            alert("Consultation saved, but failed to send WhatsApp: " + (err.response?.data?.message || err.message));
          }
        }
      } else {
        alert("Consultation saved successfully!");
      }

      // Clear form AFTER PDF is generated and sent
      setVisitSymptoms("")
      setVisitDiagnosis("")
      setVisitAdvice("")
      setVisitInternalNotes("")
      setVisitWeight("")
      setVisitTemperature("")
      setVisitBloodPressure("")
      setVisitHeartRate("")
      setVisitRespiratoryRate("")
      setVisitOxygenLevel("")
      setVisitBloodSugar("")
      setVisitMedicines([])
      setVisitFollowUpDate("")
      setVisitFollowUpInstructions("")
      setVisitFiles([])
      setStagingFile(null)
      setEditingVisitId(null)
    },
    onError: (err: any) => {
      alert("Failed to save consultation: " + (err.response?.data || err.message))
    }
  })

  const addMedicine = () => {
    if (!medName) return
    setVisitMedicines([...visitMedicines, {
      medicineName: medName, dosage: medDosage, foodTiming: medTiming, courseDuration: medDuration,
      doseQty: medDosage, doseSchedule: medSchedule, medicineType: medType, clinicalInstructions: medInstructions
    }])
    setMedName("")
    setMedDosage("")
    setMedTiming("")
    setMedDuration("")
    setMedType("Tablet")
    setMedSchedule("")
    setMedInstructions("")
  }

  const removeMedicine = (idx: number) => {
    setVisitMedicines(visitMedicines.filter((_, i) => i !== idx))
  }

  const handleEditVisit = (visit: any) => {
    setEditingVisitId(visit.id)
    setVisitDoctorId(visit.doctorId || "")
    setVisitSymptoms(visit.symptoms || "")
    setVisitDiagnosis(visit.diagnosis || "")
    setVisitAdvice(visit.advice || "")
    setVisitInternalNotes(visit.internalNotes || "")
    setVisitWeight(visit.weight ? visit.weight.toString() : "")
    setVisitTemperature(visit.temperature ? visit.temperature.toString() : "")
    setVisitBloodPressure(visit.bloodPressure || "")
    setVisitHeartRate(visit.heartRate ? visit.heartRate.toString() : "")
    setVisitRespiratoryRate(visit.respiratoryRate ? visit.respiratoryRate.toString() : "")
    setVisitOxygenLevel(visit.oxygenLevel ? visit.oxygenLevel.toString() : "")
    setVisitBloodSugar(visit.bloodSugar ? visit.bloodSugar.toString() : "")
    setVisitMedicines(visit.medicines ? visit.medicines.map((m: any) => ({
      medicineName: m.medicineName, dosage: m.dosage || m.doseQty || "", foodTiming: m.foodTiming || "", courseDuration: m.courseDuration || "",
      doseQty: m.doseQty || "", doseSchedule: m.doseSchedule || "", medicineType: m.medicineType || "Tablet", clinicalInstructions: m.clinicalInstructions || ""
    })) : [])
    setVisitFollowUpDate(visit.followUpDate ? visit.followUpDate.substring(0, 10) : "")
    setVisitFollowUpInstructions(visit.followUpInstructions || "")
    setActiveTab("history")
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handlePrintPrescription = async (visit: any) => {
    setPrintingVisitId(visit.id)
    setVisitToPrint(visit) // Set the data for the template

    // Give React a moment to render the template with the new data
    setTimeout(async () => {
      if (!historicPrintRef.current) {
        setPrintingVisitId(null)
        setVisitToPrint(null)
        return
      }
      try {
        await generatePdfFromElement(
          historicPrintRef.current,
          `Prescription_${patient?.name}_${new Date(visit.visitDate).toLocaleDateString()}.pdf`
        );
      } catch (err) {
        console.error("Print Error: ", err)
        alert("Failed to generate PDF")
      } finally {
        setPrintingVisitId(null)
        setVisitToPrint(null)
      }
    }, 500)
  }

  const handleSaveConsultation = () => {
    const hasContent =
      visitSymptoms.trim() ||
      visitDiagnosis.trim() ||
      visitAdvice.trim() ||
      visitMedicines.length > 0 ||
      visitWeight || visitTemperature || visitBloodPressure ||
      visitHeartRate || visitOxygenLevel || visitBloodSugar || visitRespiratoryRate;

    if (!hasContent) {
      alert("Please enter some consultation details (Symptoms, Diagnosis, Vitals, or Medicines) before saving.");
      return;
    }

    mutation.mutate();
  }

  if (isPatientLoading) {
    return <div className="p-8 flex justify-center"><Activity className="animate-spin text-indigo-500" /></div>
  }

  return (
    <div className={`flex flex-col bg-slate-50 overflow-visible lg:overflow-hidden ${isEmbedded ? 'h-auto lg:h-full' : 'min-h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)]'}`}>

      {/* Top Banner */}
      <div className="bg-white border-b border-slate-200 px-3 sm:px-6 py-3 sm:py-4 flex flex-col lg:flex-row lg:items-center justify-between shrink-0 gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          {!isEmbedded && (
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-base sm:text-lg shadow-sm shrink-0">
              {patient?.name?.charAt(0) || "P"}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight truncate">{patient?.name || "Unknown Patient"}</h1>
                <button
                  onClick={() => setIsProfileDrawerOpen(true)}
                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors shrink-0"
                  title="Edit Patient Profile"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-slate-500 mt-0.5">
                <span className="flex items-center gap-1 whitespace-nowrap"><Hash className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> {patient?.patientCode || "PT-NEW"}</span>
                <span className="flex items-center gap-1 whitespace-nowrap"><User className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> {patient?.gender || "N/A"}</span>
                <span className="flex items-center gap-1 whitespace-nowrap"><Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> {patient?.age ? `${patient.age} Yrs` : "N/A"}</span>
                {patient?.bloodGroup && <span className="flex items-center gap-1 text-red-500 whitespace-nowrap"><Droplets className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> {patient.bloodGroup}</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center w-full lg:w-auto">
          <div className="flex items-center gap-2 sm:gap-4 w-full">


            {editingVisitId && (
              <button
                onClick={() => {
                  setEditingVisitId(null)
                  setVisitSymptoms("")
                  setVisitDiagnosis("")
                  setVisitAdvice("")
                  setVisitInternalNotes("")
                  setVisitWeight("")
                  setVisitTemperature("")
                  setVisitBloodPressure("")
                  setVisitHeartRate("")
                  setVisitRespiratoryRate("")
                  setVisitOxygenLevel("")
                  setVisitBloodSugar("")
                  setVisitMedicines([])
                  setVisitFollowUpDate("")
                  setVisitFollowUpInstructions("")
                  setVisitFiles([])
                  setStagingFile(null)
                }}
                className="btn-danger flex-1 flex items-center justify-center gap-1.5 whitespace-nowrap px-2 py-2"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
            )}

            <button
              onClick={handleSaveConsultation}
              disabled={mutation.isPending}
              className="btn-primary flex-[2] sm:flex-none flex items-center justify-center gap-1.5 whitespace-nowrap px-3 py-2 text-xs sm:text-sm"
            >
              <Save className="w-4 h-4" />
              {mutation.isPending ? "Saving..." : editingVisitId ? "Save Changes" : "Save Consult"}
            </button>
          </div>
        </div>
      </div>

      {/* New Patient Banner */}
      {!editingVisitId && visitsData && visits.length === 0 && !isHistoryExpanded && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-2.5 flex items-start sm:items-center gap-3 shrink-0">
          <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg shrink-0 mt-0.5 sm:mt-0">
            <User className="w-4 h-4" />
          </div>
          <p className="text-sm text-amber-800 font-medium">
            This profile has <strong className="font-bold">no prior history</strong>. If this is an existing patient who booked using a new number, please click <strong className="font-bold text-amber-900">"Consult Another"</strong> in the Queue Panel (left) to search and link to their old profile.
          </p>
        </div>
      )}

      {/* Main Workspace Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-visible lg:overflow-hidden relative">

        {/* Mobile Floating Button for History */}
        {!isHistoryExpanded && (
          <button
            onClick={() => setIsHistoryExpanded(true)}
            className="group fixed right-0 top-[198px] h-[48px] min-w-[44px] bg-white/90 backdrop-blur-sm text-indigo-600 shadow-[-4px_4px_12px_rgba(0,0,0,0.05)] z-40 flex items-center justify-center border border-r-0 border-slate-200 rounded-bl-xl transition-all active:scale-95 px-2.5 hover:bg-white"
          >
            <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[80px] group-hover:opacity-100 group-hover:pr-2 transition-all duration-300 whitespace-nowrap text-xs font-bold">History</span>
            <ClipboardList className="w-5 h-5 shrink-0" />
          </button>
        )}

        {/* LEFT COLUMN: Active Consultation Form */}
        <div className={`w-full flex flex-col border-b lg:border-b-0 border-slate-200 bg-white lg:overflow-y-auto shrink-0 transition-all duration-300 ${isHistoryExpanded ? 'lg:w-2/3 lg:border-r' : 'lg:w-full'}`}>
          <div className="p-4 sm:p-6 space-y-8">

            {/* Header & Doctor */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-500 shrink-0" /> Active Consultation
              </h2>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 w-full sm:w-auto">
                <label className="text-sm font-medium text-slate-600">Consulting Doctor:</label>
                <select
                  value={visitDoctorId}
                  onChange={(e) => setVisitDoctorId(e.target.value)}
                  disabled={user?.role === "Doctor"}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-100 disabled:cursor-not-allowed w-full sm:w-auto"
                >
                  <option value="">Select Doctor</option>
                  {doctors?.map((d: any) => (
                    <option key={d.id} value={d.id}>Dr. {d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Symptoms & Diagnosis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <Activity className="w-4 h-4 text-red-500" /> Symptoms / Complaints
                </label>
                <textarea
                  value={visitSymptoms}
                  onChange={(e) => setVisitSymptoms(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  placeholder="What is the patient experiencing?"
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <ClipboardList className="w-4 h-4 text-indigo-500" /> Diagnosis
                </label>
                <textarea
                  value={visitDiagnosis}
                  onChange={(e) => setVisitDiagnosis(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  placeholder="Clinical diagnosis..."
                />
              </div>
            </div>

            {/* Vitals Grid */}
            <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-rose-500" /> Clinical Vitals
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Weight (kg)</label>
                  <input type="number" value={visitWeight} onChange={e => setVisitWeight(e.target.value)} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm" placeholder="70" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Temp (°F)</label>
                  <input type="number" value={visitTemperature} onChange={e => setVisitTemperature(e.target.value)} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm" placeholder="98.6" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">BP (mmHg)</label>
                  <input type="text" value={visitBloodPressure} onChange={e => setVisitBloodPressure(e.target.value)} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm" placeholder="120/80" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">SpO2 (%)</label>
                  <input type="number" value={visitOxygenLevel} onChange={e => setVisitOxygenLevel(e.target.value)} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm" placeholder="98" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Heart Rate</label>
                  <input type="number" value={visitHeartRate} onChange={e => setVisitHeartRate(e.target.value)} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm" placeholder="72" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Sugar (mg/dL)</label>
                  <input type="number" value={visitBloodSugar} onChange={e => setVisitBloodSugar(e.target.value)} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm" placeholder="110" />
                </div>
              </div>
            </div>

            {/* Prescriptions */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-500" /> E-Prescription
              </h3>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Medicine Name *</label>
                    <MedicineAutocomplete
                      value={medName}
                      onChange={setMedName}
                      onSelectMedicine={(med) => {
                        if (med.type) setMedType(med.type);
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
                    <select value={medType} onChange={e => setMedType(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                      <option value="">Select Type</option>
                      {medicineTypesData?.map((t: any) => (
                        <option key={t.id} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Dose Qty</label>
                    <input value={medDosage} onChange={e => setMedDosage(e.target.value)} placeholder="e.g. 1, 5ml" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Schedule</label>
                    <select value={medSchedule} onChange={e => setMedSchedule(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                      <option value="">Select</option>
                      <option value="1-0-1">1-0-1</option>
                      <option value="1-1-1">1-1-1</option>
                      <option value="1-0-0">1-0-0</option>
                      <option value="0-0-1">0-0-1</option>
                      <option value="SOS">SOS</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Timing</label>
                    <select value={medTiming} onChange={e => setMedTiming(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                      <option value="">Select</option>
                      <option value="After Food">After Food</option>
                      <option value="Before Food">Before Food</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Duration</label>
                    <input value={medDuration} onChange={e => setMedDuration(e.target.value)} placeholder="e.g. 5 Days" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Instructions</label>
                    <input value={medInstructions} onChange={e => setMedInstructions(e.target.value)} placeholder="e.g. With warm water" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                </div>
                <div className="mt-3 text-right">
                  <button onClick={addMedicine} className="btn-primary">
                    <Plus className="w-4 h-4" /> Add Medicine
                  </button>
                </div>

                {visitMedicines.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {visitMedicines.map((med, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-3 rounded-lg border border-slate-200 shadow-sm gap-3">
                        <div className="flex flex-col gap-1 w-full sm:mr-4">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-800">{med.medicineName}</span>
                            {med.medicineType && <span className="text-xs text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded">{med.medicineType}</span>}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            {med.doseQty && <span><strong className="font-medium text-slate-600">Qty:</strong> {med.doseQty}</span>}
                            {med.doseSchedule && <span><strong className="font-medium text-slate-600">Sch:</strong> {med.doseSchedule}</span>}
                            {med.foodTiming && <span><strong className="font-medium text-slate-600">Timing:</strong> {med.foodTiming}</span>}
                            {med.courseDuration && <span><strong className="font-medium text-slate-600">Dur:</strong> {med.courseDuration}</span>}
                          </div>
                          {med.clinicalInstructions && <span className="text-xs text-indigo-500">{med.clinicalInstructions}</span>}
                        </div>
                        <button onClick={() => removeMedicine(idx)} className="text-rose-500 p-2 hover:bg-rose-50 rounded transition-colors shrink-0 self-end sm:self-auto border border-rose-100 sm:border-transparent">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Advice & Notes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6 lg:pb-12">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <HeartPulse className="w-4 h-4 text-emerald-500" /> Advice & Treatment Plan
                </label>
                <textarea
                  value={visitAdvice}
                  onChange={(e) => setVisitAdvice(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  placeholder="Instructions, diet, rest..."
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <Edit className="w-4 h-4 text-amber-500" /> Private Notes
                </label>
                <textarea
                  value={visitInternalNotes}
                  onChange={(e) => setVisitInternalNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  placeholder="Confidential observations..."
                />
              </div>
            </div>

            {/* Attachments & Follow-up */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-sky-500" /> Attachments
                </h3>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex flex-col gap-3">
                    <select value={stagingCategory} onChange={e => setStagingCategory(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-full">
                      <option value="Lab Report">Lab Report</option>
                      <option value="X-Ray">X-Ray</option>
                      <option value="MRI Scan">MRI Scan</option>
                      <option value="Other">Other</option>
                    </select>
                    <div className="flex gap-2 w-full">
                      <input type="file" onChange={e => { if (e.target.files?.[0]) setStagingFile(e.target.files[0]) }} className="flex-1 min-w-0 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100" />
                      <button onClick={() => { if (stagingFile) { setVisitFiles([...visitFiles, { file: stagingFile, category: stagingCategory }]); setStagingFile(null); } }} className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-100 flex items-center justify-center shrink-0 transition-colors">
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  {visitFiles.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {visitFiles.map((file, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white p-2 border border-slate-200 rounded-lg">
                          <span className="text-xs font-medium truncate flex-1">[{file.category}] {file.file.name}</span>
                          <button onClick={() => setVisitFiles(visitFiles.filter((_, i) => i !== idx))} className="text-rose-500 hover:bg-rose-50 p-1 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-pink-500" /> Next Follow-Up
                </h3>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
                    <input type="date" value={visitFollowUpDate} onChange={e => setVisitFollowUpDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Instructions</label>
                    <input type="text" value={visitFollowUpInstructions} onChange={e => setVisitFollowUpInstructions(e.target.value)} placeholder="E.g. After doing lipid profile" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: Patient History & Lab Reports */}
        {/* Mobile: Right Drawer overlay when expanded. Desktop: normal flex side panel. */}
        <div className={`w-full flex flex-col bg-slate-50 shrink-0 transition-all duration-300 overflow-hidden ${isHistoryExpanded ? 'fixed inset-y-0 right-0 w-[85vw] max-w-[400px] z-50 shadow-[-20px_0_40px_rgba(0,0,0,0.2)] lg:relative lg:inset-auto lg:w-1/3 lg:shadow-none border-l border-slate-200 opacity-100 flex' : 'hidden lg:flex lg:relative lg:w-0 opacity-0'}`}>

          <div className="flex bg-white border-b border-slate-200 shrink-0 sticky top-0 z-10 whitespace-nowrap min-w-[300px] justify-between">
            <div className="flex flex-1">
              <button
                onClick={() => setActiveTab("history")}
                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === "history" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
              >
                Patient History
              </button>
              <button
                onClick={() => setActiveTab("attachments")}
                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === "attachments" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
              >
                Lab Reports
              </button>
            </div>
            <button
              onClick={() => setIsHistoryExpanded(false)}
              className="p-3 text-slate-400 hover:text-slate-600 border-l border-slate-100 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
            {activeTab === "history" && (
              <div className="space-y-4">
                {visits?.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">No previous visits found.</div>
                ) : (
                  visits?.map((visit: any, index: number) => (
                    <div key={visit.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                      <div className="flex flex-col gap-3 border-b border-slate-100 pb-3">
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col gap-1.5 w-full">
                            <div className="font-bold text-slate-800 flex items-center gap-2 whitespace-nowrap text-sm sm:text-base">
                              <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
                              {new Date(visit.visitDate).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                            <span className="text-[11px] font-bold text-slate-500 w-fit bg-slate-100 px-2 py-1 rounded-md truncate max-w-[200px]">Dr. {visit.doctorName || 'Unknown'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 w-full">
                          {index === 0 && (
                            <button
                              onClick={() => handleEditVisit(visit)}
                              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-sm"
                              title="Edit Consultation"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              Edit
                            </button>
                          )}
                          <button
                            onClick={() => handlePrintPrescription(visit)}
                            disabled={printingVisitId === visit.id}
                            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 whitespace-nowrap shadow-sm"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            {printingVisitId === visit.id ? "Printing..." : "Print Rx"}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        {visit.symptoms && (
                          <div className="text-slate-600"><span className="font-bold text-slate-700">Symptoms:</span> {visit.symptoms}</div>
                        )}
                        {visit.diagnosis && (
                          <div className="text-slate-600"><span className="font-bold text-slate-700">Diagnosis:</span> {visit.diagnosis}</div>
                        )}
                        {visit.advice && (
                          <div className="text-slate-600"><span className="font-bold text-slate-700">Treatment Plan:</span> {visit.advice}</div>
                        )}

                        {/* Collapsible Details */}
                        <details className="group mt-3 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                          <summary className="flex items-center justify-between px-4 py-2 cursor-pointer font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                            <span>View Full Details</span>
                            <span className="transition group-open:rotate-180">
                              <svg fill="none" height="16" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="M6 9l6 6 6-6"></path></svg>
                            </span>
                          </summary>

                          <div className="p-4 space-y-4 bg-white">

                            {/* Vitals Grid */}
                            {(visit.weight || visit.bloodPressure || visit.temperature || visit.heartRate || visit.oxygenLevel || visit.bloodSugar || visit.respiratoryRate) && (
                              <div>
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> Clinical Vitals</h4>
                                <div className="grid grid-cols-3 gap-2">
                                  {visit.weight && <div className="bg-emerald-50 text-emerald-700 p-2 rounded-lg border border-emerald-100"><div className="text-[10px] uppercase font-bold opacity-70">Weight</div><div className="font-semibold text-sm">{visit.weight} kg</div></div>}
                                  {visit.temperature && <div className="bg-amber-50 text-amber-700 p-2 rounded-lg border border-amber-100"><div className="text-[10px] uppercase font-bold opacity-70">Temp</div><div className="font-semibold text-sm">{visit.temperature}°F</div></div>}
                                  {visit.bloodPressure && <div className="bg-violet-50 text-violet-700 p-2 rounded-lg border border-violet-100"><div className="text-[10px] uppercase font-bold opacity-70">BP</div><div className="font-semibold text-sm">{visit.bloodPressure}</div></div>}
                                  {visit.bloodSugar && <div className="bg-pink-50 text-pink-700 p-2 rounded-lg border border-pink-100"><div className="text-[10px] uppercase font-bold opacity-70">Sugar</div><div className="font-semibold text-sm">{visit.bloodSugar}</div></div>}
                                  {visit.oxygenLevel && <div className="bg-sky-50 text-sky-700 p-2 rounded-lg border border-sky-100"><div className="text-[10px] uppercase font-bold opacity-70">SpO2</div><div className="font-semibold text-sm">{visit.oxygenLevel}%</div></div>}
                                  {visit.heartRate && <div className="bg-rose-50 text-rose-700 p-2 rounded-lg border border-rose-100"><div className="text-[10px] uppercase font-bold opacity-70">Heart Rate</div><div className="font-semibold text-sm">{visit.heartRate} bpm</div></div>}
                                  {visit.respiratoryRate && <div className="bg-teal-50 text-teal-700 p-2 rounded-lg border border-teal-100"><div className="text-[10px] uppercase font-bold opacity-70">Resp. Rate</div><div className="font-semibold text-sm">{visit.respiratoryRate}/min</div></div>}
                                </div>
                              </div>
                            )}

                            {/* Medicines */}
                            {visit.medicines && visit.medicines.length > 0 && (
                              <div>
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Prescriptions</h4>
                                <div className="space-y-1 bg-slate-50 border border-slate-100 rounded-lg p-2">
                                  {visit.medicines.map((m: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                                      <span className="font-semibold text-slate-700 text-xs flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>{m.medicineName}</span>
                                      <span className="text-xs text-slate-500 font-medium">{m.dosage} <span className="text-slate-400 font-normal">({m.foodTiming}) for {m.courseDuration}</span></span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Attachments */}
                            {visit.attachments && visit.attachments.length > 0 && (
                              <div>
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Attachments</h4>
                                <div className="flex flex-col gap-1">
                                  {visit.attachments.map((a: any) => (
                                    <a key={a.id} href={`/api${a.fileUrl}`} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1">
                                      <FileText className="w-3 h-3" /> [{a.category}] {a.fileName}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Follow Ups */}
                            {visit.followUpDate && (
                              <div className="bg-pink-50 border border-pink-100 rounded-lg p-3">
                                <span className="text-xs font-bold text-pink-600 flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> Next Follow-Up</span>
                                <div className="mt-1 font-semibold text-sm text-pink-900">{new Date(visit.followUpDate).toLocaleDateString()}</div>
                                {visit.followUpInstructions && <div className="text-xs text-pink-700 mt-1 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {visit.followUpInstructions}</div>}
                              </div>
                            )}

                            {visit.internalNotes && (
                              <div className="mt-2 pt-3 border-t border-slate-100">
                                <span className="text-xs font-bold text-amber-600 flex items-center gap-1"><Edit className="w-3 h-3" /> Private Note:</span>
                                <p className="text-xs text-slate-600 italic mt-1">{visit.internalNotes}</p>
                              </div>
                            )}
                          </div>
                        </details>
                      </div>
                    </div>
                  ))
                )}
                {/* History Pagination */}
                {totalHistoryPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
                    <button
                      disabled={historyPage === 1}
                      onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                      className="px-3 py-1.5 text-sm font-bold text-slate-700 bg-transparent border border-slate-300 hover:bg-slate-50 rounded-lg disabled:opacity-50 transition-colors"
                    >
                      Previous
                    </button>
                    <span className="text-xs font-bold text-slate-500">Page {historyPage} of {totalHistoryPages}</span>
                    <button
                      disabled={historyPage === totalHistoryPages}
                      onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                      className="px-3 py-1.5 text-sm font-bold text-slate-700 bg-transparent border border-slate-300 hover:bg-slate-50 rounded-lg disabled:opacity-50 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === "attachments" && (
              <div className="space-y-3">
                {attachments?.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">No attachments found.</div>
                ) : (
                  attachments?.map((attachment: any) => (
                    <div key={attachment.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shadow-sm border border-sky-100">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-800">{attachment.fileName}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{attachment.category} • {new Date(attachment.uploadDate).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <a
                          href={`/api${attachment.fileUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View File"
                        >
                          <Upload className="w-4 h-4 rotate-180" />
                        </a>
                        <button
                          onClick={() => {
                            if (window.confirm("Delete this attachment permanently?")) {
                              deleteAttachmentMutation.mutate(attachment.id)
                            }
                          }}
                          disabled={deleteAttachmentMutation.isPending}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete File"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Hidden PDF Template */}
      <div style={{ position: "absolute", top: "-9999px", left: "-9999px" }}>
        {/* Active Consultation Inline Hidden Template */}
        {/* We keep this here so the active form matches the new standard design for WhatsApp auto-send */}
        <PrescriptionTemplate
          ref={printRef}
          patient={patient}
          visit={{
            visitDate: new Date().toISOString(),
            symptoms: visitSymptoms,
            diagnosis: visitDiagnosis,
            advice: visitAdvice,
            bloodPressure: visitBloodPressure,
            heartRate: visitHeartRate,
            temperature: visitTemperature,
            weight: visitWeight,
            oxygenLevel: visitOxygenLevel,
            medicines: visitMedicines,
            followUpDate: visitFollowUpDate,
            followUpInstructions: visitFollowUpInstructions,
            doctorName: doctors?.find((d: any) => String(d.id) === String(visitDoctorId))?.name
          }}
          doctor={doctors?.find((d: any) => String(d.id) === String(visitDoctorId))}
          branch={currentBranch}
        />
      </div>

      {/* Template for Printing Historic Visits */}
      {visitToPrint && (
        <PrescriptionTemplate
          ref={historicPrintRef}
          patient={patient}
          visit={visitToPrint}
          doctor={doctors?.find((d: any) => String(d.id) === String(visitToPrint.doctorId))}
          branch={visitToPrint.branchId ? branches?.find((b: any) => b.id === visitToPrint.branchId) : currentBranch}
        />
      )}

      <PatientProfileDrawer
        isOpen={isProfileDrawerOpen}
        onClose={() => setIsProfileDrawerOpen(false)}
        editingPatient={patient}
      />
    </div>
  )
}
