import Link from "next/link";

interface OutfitCardProps {
  outfit: {
    id: number;
    name: string;
    imageUrl?: string | null;
    inspirationPhotoUrl?: string | null;
    occasion?: string | null;
    season?: string | null;
    items?: {
      id: number;
      title: string;
      imageUrl: string | null;
    }[];
  };
  similarity?: number; // Optional similarity score for search results
}

export function OutfitCard({ outfit, similarity }: OutfitCardProps) {
  // Use inspirationPhotoUrl if available, otherwise use imageUrl (collage)
  const displayImage = outfit.inspirationPhotoUrl || outfit.imageUrl;

  return (
    <Link
      href={`/outfits/${outfit.id}`}
      className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow block"
    >
      {/* Outfit Photo or Items Preview */}
      <div className="bg-gray-100 p-4">
        {displayImage ? (
          <div className="aspect-[4/5] bg-white rounded overflow-hidden">
            <img
              src={displayImage}
              alt={outfit.name}
              className="w-full h-full object-cover object-top"
            />
          </div>
        ) : outfit.items && outfit.items.length > 0 ? (
          /* Fallback to item grid */
          <div className="grid grid-cols-3 gap-2">
            {outfit.items.slice(0, 3).map((item) => (
              <div key={item.id} className="aspect-square bg-gray-200 rounded">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover rounded"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                    No image
                  </div>
                )}
              </div>
            ))}
            {outfit.items.length > 3 && (
              <div className="aspect-square bg-gray-300 rounded flex items-center justify-center text-gray-600 text-sm font-medium">
                +{outfit.items.length - 3}
              </div>
            )}
          </div>
        ) : (
          /* No image or items */
          <div className="aspect-[4/5] bg-gray-200 rounded flex items-center justify-center">
            <span className="text-gray-400">No image</span>
          </div>
        )}
      </div>

      {/* Outfit Details */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {outfit.name}
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {outfit.occasion && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                {outfit.occasion}
              </span>
            )}
            {outfit.season && (
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                {outfit.season}
              </span>
            )}
          </div>
          {similarity !== undefined && (
            <span className="text-xs text-gray-500">
              {Math.round(similarity * 100)}% match
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
