import { useParams } from "react-router-dom";
import BookDetailsModal from "../components/BookDetailsModal";

export default function BookDetailsPage() {
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-black/50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <BookDetailsModal bookId={id} isOpen={true} onClose={() => window.history.back()} />
      </div>
    </div>
  );
}