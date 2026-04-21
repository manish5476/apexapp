import { ProductService } from '@/src/api/productService';

export const productService = {
  list: ProductService.getAllProducts,
  byId: ProductService.getProductById,
  create: ProductService.createProduct,
  update: ProductService.updateProduct,
  uploadImage: ProductService.uploadProductFile,
  remove: ProductService.deleteProductById,
  search: ProductService.searchProducts,
  lowStock: ProductService.getLowStockProducts,
  history: ProductService.getProductHistory,
};
