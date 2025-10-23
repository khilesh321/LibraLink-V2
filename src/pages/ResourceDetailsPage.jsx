import { useParams } from "react-router-dom";
import ResourcesDetailsModal from "../components/ResourcesDetailsModal";

export default function ResourceDetailsPage() {
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-black/50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <ResourcesDetailsModal documentId={id} isOpen={true} onClose={() => window.history.back()} />
      </div>
    </div>
  );
}