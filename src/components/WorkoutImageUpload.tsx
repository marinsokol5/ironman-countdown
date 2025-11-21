import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface WorkoutImageUploadProps {
  userId: string;
  onWorkoutExtracted: () => void;
}

export const WorkoutImageUpload = ({ userId, onWorkoutExtracted }: WorkoutImageUploadProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setSelectedFile(file);
    setExtractedData(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadAndExtract = async () => {
    if (!selectedFile || !userId) return;

    setUploading(true);
    setExtracting(false);

    try {
      // Upload to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('workout-images')
        .upload(fileName, selectedFile);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('workout-images')
        .getPublicUrl(fileName);

      toast.success("Image uploaded successfully!");
      setUploading(false);
      setExtracting(true);

      // Call edge function to extract workout data
      const { data: extractData, error: extractError } = await supabase.functions.invoke(
        'extract-workout',
        {
          body: { imageUrl: publicUrl }
        }
      );

      if (extractError) {
        throw extractError;
      }

      if (extractData?.error) {
        toast.error(extractData.error);
        setExtracting(false);
        return;
      }

      if (extractData?.success && extractData?.data) {
        setExtractedData(extractData.data);
        toast.success("Workout data extracted!");
        setExtracting(false);
      }

    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || "Failed to process image");
      setUploading(false);
      setExtracting(false);
    }
  };

  const handleSaveWorkout = async () => {
    if (!extractedData || !userId) return;

    try {
      const { error } = await supabase
        .from('workouts')
        .insert([{
          user_id: userId,
          sport: extractedData.sport,
          date: extractedData.date || new Date().toISOString().split('T')[0],
          distance_km: extractedData.distance_km || 0,
          duration_minutes: extractedData.duration_minutes || 0,
        }]);

      if (error) throw error;

      toast.success("Workout saved successfully!");
      
      // Reset form
      setSelectedFile(null);
      setPreviewUrl(null);
      setExtractedData(null);
      
      // Notify parent to refresh data
      onWorkoutExtracted();

    } catch (error: any) {
      console.error('Error saving workout:', error);
      toast.error("Failed to save workout");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Workout Image</CardTitle>
        <CardDescription>
          Take a photo of your workout log or screenshot and AI will extract the data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="workout-image">Select Image</Label>
          <Input
            id="workout-image"
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={uploading || extracting}
          />
        </div>

        {previewUrl && (
          <div className="relative border rounded-lg overflow-hidden">
            <img 
              src={previewUrl} 
              alt="Preview" 
              className="w-full h-auto max-h-64 object-contain bg-muted"
            />
          </div>
        )}

        {selectedFile && !extractedData && (
          <Button 
            onClick={handleUploadAndExtract} 
            disabled={uploading || extracting}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : extracting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Extracting workout data...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload & Extract Data
              </>
            )}
          </Button>
        )}

        {extractedData && (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-start gap-2 mb-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100">Data Extracted Successfully!</p>
                  <p className="text-sm text-green-700 dark:text-green-300">Review and save the workout below</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Sport</p>
                  <p className="font-medium capitalize">{extractedData.sport}</p>
                </div>
                {extractedData.date && (
                  <div>
                    <p className="text-muted-foreground">Date</p>
                    <p className="font-medium">{extractedData.date}</p>
                  </div>
                )}
                {extractedData.distance_km && (
                  <div>
                    <p className="text-muted-foreground">Distance</p>
                    <p className="font-medium">{extractedData.distance_km} km</p>
                  </div>
                )}
                {extractedData.duration_minutes && (
                  <div>
                    <p className="text-muted-foreground">Duration</p>
                    <p className="font-medium">{extractedData.duration_minutes} min</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSaveWorkout} className="flex-1">
                Save Workout
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  setExtractedData(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
