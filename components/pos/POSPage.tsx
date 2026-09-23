import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SalesInterface from './SalesInterface';
import ProductsInventoryPage from './ProductsInventoryPage';
import ProductDetailPage from './ProductDetailPage';
import OrdersManagementPage from './OrdersManagementPage';
import OrderDetailPage from './OrderDetailPage';
import DeliveryTrackingPage from './DeliveryTrackingPage';
import RevenueDashboard from './RevenueDashboard';
import CustomerListPage from './CustomerListPage';
import CustomerDetailPage from './CustomerDetailPage';

const POSPage: React.FC = () => {
    return (
        <Routes>
            <Route index element={<SalesInterface />} />
            <Route path="sales" element={<SalesInterface />} />
            <Route path="products" element={<ProductsInventoryPage />} />
            <Route path="products/:productId" element={<ProductDetailPage />} />
            <Route path="inventory" element={<ProductsInventoryPage />} />
            <Route path="orders" element={<OrdersManagementPage />} />
            <Route path="orders/:orderId" element={<OrderDetailPage />} />
            <Route path="delivery" element={<DeliveryTrackingPage />} />
            <Route path="revenue" element={<RevenueDashboard />} />
            <Route path="customers" element={<CustomerListPage />} />
            <Route path="customers/:customerId" element={<CustomerDetailPage />} />
        </Routes>
    );
};

export default POSPage;






