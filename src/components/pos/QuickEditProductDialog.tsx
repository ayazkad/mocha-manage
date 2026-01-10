import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, X, Trash2 } from 'lucide-react';

interface Product {
  id: string;
  name_fr: string;
  name_en: string;
  base_price: number;
  category_id: string;
  image_url?: string;
  has_size_options?: boolean;
  has_milk_options?: boolean;
  has_temperature_options?: boolean;
}

interface QuickEditProductDialogProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const QuickEditProductDialog = ({ product, open, onClose, onSaved }: QuickEditProductDialogProps) => {
  const [categories, setCategories] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    base_price: '',
    category_id: '',
    image_url: '',
    has_size_options: false,
    has_milk_options: false,
    has_temperature_options: false,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadCategories();
      if (product) {
        setFormData({
          name: product.name_en || product.name_fr,
          base_price: product.base_price.toString(),
          category_id: product.category_id,
          image_url: product.image_url || '',
          has_size_options: product.has_size_options || false,
          has_milk_options: product.has_milk_options || false,
          has_temperature_options: product.has_temperature_options || false,
        });
        setImagePreview(product.image_url || null);
      }
    }
  }, [open, product]);

  const loadCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('active', true)
      .order('sort_order');

    setCategories(data || []);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData({ ...formData, image_url: '' });
  };

  const handleSave = async () => {
    if (!product) return;

    setLoading(true);
    try {
      let imageUrl = formData.image_url;

      // Upload new image if there's one
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      const { error } = await supabase
        .from('products')
        .update({
          name_en: formData.name,
          name_fr: formData.name,
          base_price: parseFloat(formData.base_price),
          category_id: formData.category_id || null,
          image_url: imageUrl,
          has_size_options: formData.has_size_options,
          has_milk_options: formData.has_milk_options,
          has_temperature_options: formData.has_temperature_options,
        })
        .eq('id', product.id);

      if (error) throw error;

      toast.success('Product updated');
      onSaved();
      onClose();
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Error updating product');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;
    
    if (!confirm('Are you sure you want to delete this product?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);

      if (error) throw error;

      toast.success('Product deleted');
      onSaved();
      onClose();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Error deleting product');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryName = (category: any) => {
    return category.name_en || category.name_fr;
  };

  const toggleOption = (option: 'has_size_options' | 'has_milk_options' | 'has_temperature_options') => {
    setFormData({ ...formData, [option]: !formData[option] });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {product?.name_en || product?.name_fr}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-[80px_1fr] items-center gap-2">
            <Label htmlFor="name" className="text-right">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Name"
            />
          </div>

          <div className="grid grid-cols-[80px_1fr] items-center gap-2">
            <Label htmlFor="price" className="text-right">Price</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={formData.base_price}
              onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-[80px_1fr] items-center gap-2">
            <Label className="text-right">Image URL</Label>
            <Input
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              placeholder="/placeholder.svg"
            />
          </div>

          <div className="grid grid-cols-[80px_1fr] items-center gap-2">
            <Label htmlFor="category" className="text-right">Category</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {getCategoryName(cat)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Options buttons */}
          <div className="grid grid-cols-[80px_1fr] items-center gap-2">
            <Label className="text-right">Options</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={formData.has_size_options ? "default" : "outline"}
                size="sm"
                onClick={() => toggleOption('has_size_options')}
                className="min-w-[60px]"
              >
                Size
              </Button>
              <Button
                type="button"
                variant={formData.has_milk_options ? "default" : "outline"}
                size="sm"
                onClick={() => toggleOption('has_milk_options')}
                className="min-w-[60px]"
              >
                Milk
              </Button>
              <Button
                type="button"
                variant={formData.has_temperature_options ? "default" : "outline"}
                size="sm"
                onClick={() => toggleOption('has_temperature_options')}
                className="w-full"
              >
                Hot / Cold
              </Button>
            </div>
          </div>

          {/* Product Photo */}
          <div>
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            <div className="mt-2">
              {imagePreview && (
                <div className="relative w-full h-32 rounded-md overflow-hidden bg-muted mb-2">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={removeImage}
                    className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="flex-1"
            >
              Save changes
            </Button>
          </div>
          
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
            className="w-full"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Product
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickEditProductDialog;