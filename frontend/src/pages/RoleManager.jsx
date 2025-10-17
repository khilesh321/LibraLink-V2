import { useState, useEffect } from "react";
import { supabase } from "../supabase/supabaseClient";
import useUserRole from "../supabase/useUserRole";
import { toast } from "react-toastify";

export default function RoleManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { role: currentUserRole } = useUserRole();

  useEffect(() => {
    if (currentUserRole === "admin") {
      fetchUsers();
    }
  }, [currentUserRole]);

  const fetchUsers = async () => {
    try {
      // Use the database function to get users with profiles and emails
      const { data: users, error } = await supabase.rpc(
        "get_users_with_profiles"
      );

      if (error) {
        console.error("Error fetching users:", error);
        return;
      }

      setUsers(users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      console.log("Updating user role:", userId, "to", newRole);

      // Use the database function to update user role
      const { data, error } = await supabase.rpc("update_user_role", {
        target_user_id: userId,
        new_role: newRole,
      });

      if (error) {
        console.error("Error updating role:", error);
        toast.error(`Failed to update user role: ${error.message}`);
        return;
      }

      console.log("Role updated successfully");
      // Update local state
      setUsers(
        users.map((user) =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      );
      toast.success("Role updated successfully");
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update user role");
    }
  };

  // Filter users based on search query
  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    );
  });

  if (currentUserRole !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">🚫</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600">
            Only administrators can manage user roles.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">
              User Role Management
            </h1>

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search users by email or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <svg
                      className="h-5 w-5 text-gray-400 hover:text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Results Summary */}
            {searchQuery && (
              <div className="mb-4 text-sm text-gray-600">
                Found {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} matching "{searchQuery}"
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Role
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Sign In
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.email}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.role === "admin"
                              ? "bg-red-100 text-red-800"
                              : user.role === "librarian"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.last_sign_in_at
                          ? new Date(user.last_sign_in_at).toLocaleDateString()
                          : "Never"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        {user.role !== "student" && (
                          <button
                            onClick={() => updateUserRole(user.id, "student")}
                            className="text-green-600 hover:text-green-900"
                          >
                            Make Student
                          </button>
                        )}
                        {user.role !== "librarian" && (
                          <button
                            onClick={() => updateUserRole(user.id, "librarian")}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Make Librarian
                          </button>
                        )}
                        {user.role !== "admin" && (
                          <button
                            onClick={() => updateUserRole(user.id, "admin")}
                            className="text-red-600 hover:text-red-900"
                          >
                            Make Admin
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-4xl mb-4">👥</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery ? "No users found" : "No users available"}
                </h3>
                <p className="text-gray-500">
                  {searchQuery
                    ? `No users match your search for "${searchQuery}". Try different keywords.`
                    : "There are no users to manage at this time."}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
