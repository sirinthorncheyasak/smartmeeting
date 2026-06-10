import { 
  collection, 
  doc, 
  runTransaction, 
  getDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  getDocs,
  where,
  addDoc,
  setDoc,
  DocumentReference
} from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { Document, AuditLog, DocumentType, DocumentStatus, DocumentDirection } from "../types";

/**
 * Generates current counter ID (Format YYYYMM, e.g., 202606)
 * and Buddhist parts (e.g. year 2026 -> Buddhist Year 2569 -> "69", month "06")
 */
export function getBuddhistPeriodInfo(dateInput: Date = new Date()) {
  const westernYear = dateInput.getFullYear();
  const monthInt = dateInput.getMonth() + 1;
  const mm = String(monthInt).padStart(2, '0');
  
  const buddhistYear = westernYear + 543;
  const yy = String(buddhistYear).slice(-2); // e.g. "69"
  
  const counterId = `${westernYear}${mm}`; // e.g., "202606"
  
  return {
    counterId,
    yy,
    mm
  };
}

/**
 * Transactional Safe outbound document creation with auto-generated document numbers.
 */
export async function createDocumentTransaction(payload: {
  type: DocumentType;
  title: string;
  description?: string;
  direction: DocumentDirection;
  createdByName: string;
}): Promise<string> {
  const userEmail = auth.currentUser?.email;
  if (!userEmail) {
    throw new Error("Authentication required to register documents.");
  }

  // Create references and IDs in advance
  const documentsRef = collection(db, "documents");
  const newDocRef = doc(documentsRef); // auto ID
  const newDocId = newDocRef.id;

  const logsRef = collection(db, "auditLogs");
  const newLogRef = doc(logsRef);
  const newLogId = newLogRef.id;

  try {
    return await runTransaction(db, async (transaction) => {
      let finalDocNumber: string | undefined = undefined;

      if (payload.type === "outbound") {
        const periodInfo = getBuddhistPeriodInfo();
        const counterDocRef = doc(db, "counters", periodInfo.counterId);
        const counterSnap = await transaction.get(counterDocRef);

        let runningNum = 1;
        if (counterSnap.exists()) {
          const currentData = counterSnap.data();
          runningNum = (currentData.lastRunningNumber || 0) + 1;
          transaction.update(counterDocRef, {
            lastRunningNumber: runningNum,
            updatedAt: serverTimestamp()
          });
        } else {
          transaction.set(counterDocRef, {
            id: periodInfo.counterId,
            lastRunningNumber: 1,
            updatedAt: serverTimestamp()
          });
        }

        // Format: ทน.YYMMXXX e.g., ทน.6906001
        const runString = String(runningNum).padStart(3, '0');
        finalDocNumber = `ทน.${periodInfo.yy}${periodInfo.mm}${runString}`;
      }

      // Prepare fresh Document object
      const docPayload: any = {
        id: newDocId,
        type: payload.type,
        title: payload.title.trim(),
        description: payload.description?.trim() || "",
        direction: payload.direction,
        status: "approved", // Immediately filed and active (no pending approval state)
        createdBy: userEmail,
        createdByName: payload.createdByName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (finalDocNumber) {
        docPayload.documentNumber = finalDocNumber;
      }

      // Save document atomically
      transaction.set(newDocRef, docPayload);

      // Save Audit trail atomically
      const auditPayload = {
        id: newLogId,
        action: payload.type === "outbound" ? "create_outbound" : "create_inbound",
        documentId: newDocId,
        actor: userEmail,
        timestamp: serverTimestamp(),
        metadata: finalDocNumber ? { documentNumber: finalDocNumber, title: payload.title } : { title: payload.title }
      };

      transaction.set(newLogRef, auditPayload);

      return newDocId;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "documents-transaction");
    throw error;
  }
}

/**
 * Handle Document Approval workflow (Admins only)
 */
export async function approveDocument(docId: string, adminEmail: string): Promise<void> {
  const docRef = doc(db, "documents", docId);
  const logRef = doc(collection(db, "auditLogs"));

  try {
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists()) {
        throw new Error("Document not found.");
      }

      const docData = docSnap.data();
      if (docData.status !== "pending") {
        throw new Error("Only pending outbound documents can be approved.");
      }

      // Update document properties
      transaction.update(docRef, {
        status: "approved",
        approvedBy: adminEmail,
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Audit Log
      transaction.set(logRef, {
        id: logRef.id,
        action: "approve_document",
        documentId: docId,
        actor: adminEmail,
        timestamp: serverTimestamp(),
        metadata: {
          previousStatus: "pending",
          newStatus: "approved",
          documentNumber: docData.documentNumber || ""
        }
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `documents/${docId}/approve`);
  }
}

/**
 * Handle Document Rejection workflow (Admins only)
 */
export async function rejectDocument(docId: string, adminEmail: string, rejectReason: string): Promise<void> {
  const docRef = doc(db, "documents", docId);
  const logRef = doc(collection(db, "auditLogs"));

  try {
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists()) {
        throw new Error("Document not found.");
      }

      const docData = docSnap.data();
      if (docData.status !== "pending") {
        throw new Error("Only pending outbound documents can be rejected.");
      }

      // Update document properties
      transaction.update(docRef, {
        status: "rejected",
        rejectionReason: rejectReason.trim(),
        approvedBy: adminEmail,
        approvedAt: serverTimestamp(), // Rejection acts as the workflow completion
        updatedAt: serverTimestamp()
      });

      // Audit Log
      transaction.set(logRef, {
        id: logRef.id,
        action: "reject_document",
        documentId: docId,
        actor: adminEmail,
        timestamp: serverTimestamp(),
        metadata: {
          previousStatus: "pending",
          newStatus: "rejected",
          rejectionReason: rejectReason.trim(),
          documentNumber: docData.documentNumber || ""
        }
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `documents/${docId}/reject`);
  }
}

/**
 * Update document details (Admins only)
 */
export async function updateDocumentDetails(
  docId: string, 
  title: string, 
  description: string, 
  adminEmail: string
): Promise<void> {
  const docRef = doc(db, "documents", docId);
  const logRef = doc(collection(db, "auditLogs"));

  try {
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists()) {
        throw new Error("Document not found.");
      }

      const docData = docSnap.data();

      // Update document properties
      transaction.update(docRef, {
        title: title.trim(),
        description: description.trim(),
        updatedAt: serverTimestamp()
      });

      // Audit Log
      transaction.set(logRef, {
        id: logRef.id,
        action: "edit_document",
        documentId: docId,
        actor: adminEmail,
        timestamp: serverTimestamp(),
        metadata: {
          previousTitle: docData.title,
          newTitle: title.trim(),
          documentNumber: docData.documentNumber || ""
        }
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `documents/${docId}/update`);
    throw error;
  }
}

/**
 * Delete document completely (Admins only)
 */
export async function deleteDocument(docId: string, adminEmail: string): Promise<void> {
  const docRef = doc(db, "documents", docId);
  const logRef = doc(collection(db, "auditLogs"));

  try {
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists()) {
        throw new Error("Document not found.");
      }

      const docData = docSnap.data();

      // Delete the document
      transaction.delete(docRef);

      // Audit Log
      transaction.set(logRef, {
        id: logRef.id,
        action: "delete_document",
        documentId: docId,
        actor: adminEmail,
        timestamp: serverTimestamp(),
        metadata: {
          deletedTitle: docData.title,
          documentNumber: docData.documentNumber || ""
        }
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `documents/${docId}/delete`);
    throw error;
  }
}
