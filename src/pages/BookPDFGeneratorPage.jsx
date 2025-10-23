import BookPDFGenerator from '../components/BookPDFGenerator';

const BookPDFGeneratorPage = () => {
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-purple-50 py-12">
      <div className="container mx-auto px-4">
        <BookPDFGenerator />
      </div>
    </div>
  );
};

export default BookPDFGeneratorPage;