export interface Category { 
  id: number 
  name: string 
  slug: string 
  image_url: string 
} 
 
export interface Product { 
  id: number 
  name: string 
  description: string 
  price: number 
  image_url: string 
  category_id: number 
  unit: string 
  active: boolean 
} 
 
export interface CartItem { 
  product: Product 
  quantity: number 
}
