import React from 'react';
import TenantDetailModal from './TenantDetailModal';
import CreateTenantModal from './CreateTenantModal';
import EditTenantModal from './EditTenantModal';
import UserEditModal from './UserEditModal';

const DashboardModals = ({
  showTenantModal, selectedTenant,
  editingTenant, tenantEditForm, tenantEditLoading,
  showCreateTenantModal, tenantFormData, createTenantLoading,
  showUserEditModal, editingUser, userEditForm, userEditLoading, tenants,
  onCloseTenantModal, onEditTenant, onDeleteTenant,
  onCloseEditTenant, onUpdateTenant, onTenantEditFormChange,
  onCloseCreateTenant, onCreateTenant, onTenantFormChange,
  onCloseUserEdit, onUpdateUser, onUserEditFormChange
}) => (
  <>
    {showTenantModal && selectedTenant && (
      <TenantDetailModal
        selectedTenant={selectedTenant}
        onClose={onCloseTenantModal}
        onEdit={onEditTenant}
        onDelete={onDeleteTenant}
      />
    )}

    {editingTenant && (
      <EditTenantModal
        editingTenant={editingTenant}
        tenantEditForm={tenantEditForm}
        tenantEditLoading={tenantEditLoading}
        onClose={onCloseEditTenant}
        onSubmit={onUpdateTenant}
        onFormChange={onTenantEditFormChange}
      />
    )}

    {showCreateTenantModal && (
      <CreateTenantModal
        tenantFormData={tenantFormData}
        createTenantLoading={createTenantLoading}
        onClose={onCloseCreateTenant}
        onSubmit={onCreateTenant}
        onFormChange={onTenantFormChange}
      />
    )}

    {showUserEditModal && editingUser && (
      <UserEditModal
        userEditForm={userEditForm}
        userEditLoading={userEditLoading}
        tenants={tenants}
        onClose={onCloseUserEdit}
        onSubmit={onUpdateUser}
        onFormChange={onUserEditFormChange}
      />
    )}
  </>
);

export default DashboardModals;
