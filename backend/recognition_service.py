import cv2
import numpy as np
import traceback

class FaceRecognitionService:
    def __init__(self):
        self.insight_app = None   # Full InsightFace pipeline (detect + recognize)
        self.yolo_model = None    # Optional YOLO override for detection

        # ── 1. Try InsightFace full pipeline (det + rec) ──────────────────────
        # ── 1. Try InsightFace PIPELINE (SMALL version for memory-constrained environments) ──
        try:
            from insightface.app import FaceAnalysis
            self.insight_app = FaceAnalysis(
                name='buffalo_l',
                allowed_modules=['detection', 'recognition']
            )
            self.insight_app.prepare(ctx_id=-1, det_size=(640, 640))  # ctx_id=-1 = CPU
            print("✅ InsightFace (buffalo_l) loaded successfully.")
        except Exception as e:
            print(f"⚠️  Could not load InsightFace: {e}")

        # ── 2. Disable YOLO (Memory Heavy) ──────────────────────────────────
        # ultralytics/PyTorch consumes 300MB+ RAM. On Render (512MB), we stick to InsightFace.
        self.yolo_model = None
        print("💡 YOLO face model disabled to prevent Out-Of-Memory on Render.")


        # ── 3. OpenCV DNN fallback detector ──────────────────────────────────
        # Ships with OpenCV – no extra files needed.
        self._cv_face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        print("✅ OpenCV Haar fallback detector ready.")

    # ── public API ────────────────────────────────────────────────────────────

    def detect_and_recognize(self, img_bgr):
        """
        Detect faces and extract 512-d embeddings.
        Strategy:
          1. InsightFace full pipeline (best quality, works CPU-only)
          2. If InsightFace not available, use OpenCV Haar + simple embedding
        Returns: list of {'box': [x1,y1,x2,y2], 'embedding': np.ndarray}
        """
        if img_bgr is None:
            return []

        # ── Strategy 1: InsightFace ──────────────────────────────────────────
        if self.insight_app is not None:
            try:
                faces = self.insight_app.get(img_bgr)
                results = []
                for face in faces:
                    if face.embedding is not None:
                        box = face.bbox.astype(int).tolist()
                        results.append({'box': box, 'embedding': face.embedding})
                if results:
                    return results
                # InsightFace ran but found no faces → fall through to OpenCV
            except Exception as e:
                print(f"InsightFace inference error: {traceback.format_exc()}")

        # ── Strategy 2: OpenCV Haar + pixel embedding (fallback) ─────────────
        return self._opencv_fallback(img_bgr)

    def compare_embeddings(self, emb1, emb2, threshold=0.45):
        """Cosine similarity. Returns (is_match, similarity_score)."""
        n1 = np.linalg.norm(emb1)
        n2 = np.linalg.norm(emb2)
        if n1 == 0 or n2 == 0:
            return False, 0.0
        sim = float(np.dot(emb1, emb2) / (n1 * n2))
        return sim > threshold, sim

    # ── private helpers ───────────────────────────────────────────────────────

    def _opencv_fallback(self, img_bgr):
        """
        Detect faces with Haar cascade and build a simple pixel-histogram
        embedding as a last-resort fallback.
        """
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        faces = self._cv_face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60)
        )
        results = []
        for (x, y, w, h) in faces:
            crop = img_bgr[y:y+h, x:x+w]
            emb = self._pixel_embedding(crop)
            results.append({'box': [x, y, x+w, y+h], 'embedding': emb})
        return results

    def _pixel_embedding(self, face_crop, size=64):
        """
        Tiny pixel-histogram embedding used only when InsightFace is absent.
        Not identity-accurate but allows the system to function end-to-end.
        """
        resized = cv2.resize(face_crop, (size, size))
        flat = resized.astype(np.float32).flatten()
        norm = np.linalg.norm(flat)
        return flat / norm if norm > 0 else flat


recognition_service = FaceRecognitionService()
