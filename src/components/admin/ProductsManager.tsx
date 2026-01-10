import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash2, Upload, X, ChevronUp, ChevronDown } from 'lucide-react';
import AdminBarcodeScanner from './AdminBarcodeScanner';

const ProductsManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name_en: '',
    base_price: '',
    category_id: '',
    description_en: '',
    has_size_options: false,
    has_milk_options: false,
    has_temperature_options: false,
    active: true,
    image_url: '',
    barcode: '',
    visible_in_categories: true,
  });

  const { data: products, refetch: refetchProducts } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name_en, sort_order)')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  // Group products by category
  const groupedProducts = useMemo(() => {
    if (!products) return {};
    
    const groups: { [key: string]: { name: string; sortOrder: number; products: any[] } } = {};
    
    // Initialize groups from categories
    categories?.forEach(cat => {
      groups[cat.id] = { name: cat.name_en || cat.name_fr, sortOrder: cat.sort_order || 0, products: [] };
    });
    
    // Add "No Category" group
    groups['no-category'] = { name: 'No Category', sortOrder: 9999, products: [] };
    
    // Distribute products into groups
    products.forEach(product => {
      const categoryId = product.category_id || 'no-category';
      if (groups[categoryId]) {
        groups[categoryId].products.push(product);
      } else {
        groups['no-category'].products.push(product);
      }
    });
    
    // Sort products within each group by sort_order
    Object.values(groups).forEach(group => {
      group.products.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    });
    
    return groups;
  }, [products, categories]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      let imageUrl = data.image_url;

      // Upload image if there's a new file
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

      const productData = { ...data, image_url: imageUrl };

      if (editingId) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      resetForm();
      toast({ title: editingId ? 'Product updated' : 'Product created' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: 'Product deleted' });
    },
  });

  const moveProduct = async (productId: string, categoryId: string | null, direction: 'up' | 'down') => {
    const catKey = categoryId || 'no-category';
    const group = groupedProducts[catKey];
    if (!group) return;

    const productIndex = group.products.findIndex((p: any) => p.id === productId);
    if (productIndex === -1) return;

    const swapIndex = direction === 'up' ? productIndex - 1 : productIndex + 1;
    if (swapIndex < 0 || swapIndex >= group.products.length) return;

    const currentProduct = group.products[productIndex];
    const swapProduct = group.products[swapIndex];

    // Swap sort_order values
    const currentSortOrder = currentProduct.sort_order || productIndex;
    const swapSortOrder = swapProduct.sort_order || swapIndex;

    try {
      await Promise.all([
        supabase
          .from('products')
          .update({ sort_order: swapSortOrder })
          .eq('id', currentProduct.id),
        supabase
          .from('products')
          .update({ sort_order: currentSortOrder })
          .eq('id', swapProduct.id),
      ]);

      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: 'Order updated' });
    } catch (error) {
      console.error('Error updating order:', error);
      toast({ title: 'Error updating order', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setImageFile(null);
    setImagePreview(null);
    setFormData({
      name_en: '',
      base_price: '',
      category_id: '',
      description_en: '',
      has_size_options: false,
      has_milk_options: false,
      has_temperature_options: false,
      active: true,
      image_url: '',
      barcode: '',
      visible_in_categories: true,
    });
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

  const handleEdit = (product: any) => {
    setEditingId(product.id);
    setImagePreview(product.image_url || null);
    setFormData({
      name_en: product.name_en || '',
      base_price: product.base_price.toString(),
      category_id: product.category_id || '',
      description_en: product.description_en || '',
      has_size_options: product.has_size_options || false,
      has_milk_options: product.has_milk_options || false,
      has_temperature_options: product.has_temperature_options || false,
      active: product.active,
      image_url: product.image_url || '',
      barcode: product.barcode || '',
      visible_in_categories: product.visible_in_categories !== false,
    });
  };

  const handleCategoryChange = (categoryId: string) => {
    setFormData({
      ...formData,
      category_id: categoryId,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto-capitalize first letter
    let productName = formData.name_en.trim();
    if (productName) {
      productName = productName.charAt(0).toUpperCase() + productName.slice(1);
    }

    // Check for duplicate product names
    if (products) {
      const isDuplicate = products.some(p => 
        p.name_en?.toLowerCase() === productName.toLowerCase() && 
        (!editingId || p.id !== editingId)
      );
      
      if (isDuplicate) {
        toast({ 
          title: 'Duplicate product', 
          description: 'A product with this name already exists',
          variant: 'destructive' 
        });
        return;
      }
    }
    
    saveMutation.mutate({
      name_en: productName,
      name_fr: productName,
      base_price: parseFloat(formData.base_price),
      category_id: formData.category_id || null,
      description_en: formData.description_en || null,
      has_size_options: formData.has_size_options,
      has_milk_options: formData.has_milk_options,
      has_temperature_options: formData.has_temperature_options,
      active: formData.active,
      barcode: formData.barcode || null,
      visible_in_categories: formData.visible_in_categories,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Edit Product' : 'Add New Product'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name_en">Product Name</Label>
                <Input
                  id="name_en"
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="base_price">Base Price</Label>
                <Input
                  id="base_price"
                  type="number"
                  step="0.01"
                  value={formData.base_price}
                  onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="category_id">Category</Label>
              <Select
                value={formData.category_id}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description_en">Description</Label>
              <Textarea
                id="description_en"
                value={formData.description_en}
                onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="barcode">Barcode (optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="barcode"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  placeholder="Scan or enter barcode"
                  className="flex-1"
                />
                <AdminBarcodeScanner 
                  onBarcodeScanned={(barcode) => setFormData({ ...formData, barcode })}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Products with barcodes can be scanned in POS
              </p>
            </div>

            <div>
              <Label htmlFor="image">Product Image</Label>
              <div className="space-y-2">
                {(imagePreview || formData.image_url) && (
                  <div className="relative w-32 h-32">
                    <img
                      src={imagePreview || formData.image_url}
                      alt="Product preview"
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                      onClick={removeImage}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <Label
                    htmlFor="image"
                    className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Image
                  </Label>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="has_size_options"
                  checked={formData.has_size_options}
                  onCheckedChange={(checked) => setFormData({ ...formData, has_size_options: checked })}
                />
                <Label htmlFor="has_size_options">Has Size Options</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="has_milk_options"
                  checked={formData.has_milk_options}
                  onCheckedChange={(checked) => setFormData({ ...formData, has_milk_options: checked })}
                />
                <Label htmlFor="has_milk_options">Has Milk Options</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="has_temperature_options"
                  checked={formData.has_temperature_options}
                  onCheckedChange={(checked) => setFormData({ ...formData, has_temperature_options: checked })}
                />
                <Label htmlFor="has_temperature_options">Hot / Cold</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active">Active</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="visible_in_categories"
                  checked={formData.visible_in_categories}
                  onCheckedChange={(checked) => setFormData({ ...formData, visible_in_categories: checked })}
                />
                <Label htmlFor="visible_in_categories">Visible in categories</Label>
              </div>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              If disabled, product will only be visible via barcode scan
            </p>

            <div className="flex gap-2">
              <Button type="submit">
                {editingId ? 'Update' : 'Create'}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Products List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(groupedProducts)
              .filter(([_, group]) => group.products.length > 0)
              .sort((a, b) => a[1].sortOrder - b[1].sortOrder)
              .map(([categoryId, group]) => (
                <div key={categoryId} className="space-y-2">
                  <h3 className="font-semibold text-lg border-b pb-2 text-primary">
                    {group.name}
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      ({group.products.length} products)
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {group.products.map((product: any, index: number) => (
                      <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => moveProduct(product.id, product.category_id, 'up')}
                              disabled={index === 0}
                            >
                              <ChevronUp className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => moveProduct(product.id, product.category_id, 'down')}
                              disabled={index === group.products.length - 1}
                            >
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                          </div>
                          <div>
                            <h4 className="font-semibold">{product.name_en}</h4>
                            <p className="text-sm text-muted-foreground">
                              {product.base_price} ₾
                              {!product.active && ' • Inactive'}
                              {product.barcode && ` • 📊 ${product.barcode}`}
                              {!product.visible_in_categories && ' • Scan only'}
                              {(product.has_size_options || product.has_milk_options) && ' • Has options'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => handleEdit(product)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => deleteMutation.mutate(product.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductsManager;
