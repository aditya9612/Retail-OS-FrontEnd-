import React, { useEffect, useState } from "react";
import userService from "../../services/userService";

const Employees = () => {
    const [users, setUsers] = useState([]);

    const loadUsers = async () => {
        try {
            const response = await userService.getAll({
                page: 1,
                page_size: 20,
            });

            console.log("Users API Response:", response.data);

            setUsers(response.data);
        } catch (error) {
            console.error("Failed to load users:", error);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    return (
        <div style={{ padding: "20px" }}>
            <h1>Employees Page</h1>

            <h3>Total Users: {users.length}</h3>

            <table border="1" cellPadding="10">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Full Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Role</th>
                        <th>Status</th>
                    </tr>
                </thead>

                <tbody>
                    {users.map((user) => (
                        <tr key={user.id}>
                            <td>{user.id}</td>
                            <td>{user.full_name}</td>
                            <td>{user.email}</td>
                            <td>{user.phone}</td>
                            <td>{user.role?.name}</td>
                            <td>{user.is_active ? "Active" : "Inactive"}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Employees;