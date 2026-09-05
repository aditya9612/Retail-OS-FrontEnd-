import React from "react";
import "./CategoryTable.css";

const CategoryTable = ({
  categories,
  
}) => {
  return (
    <div className="category-table-container">

      <table className="category-table">

        <thead>
          <tr>
            <th>Category Name</th>
            <th>Total Products</th>
            <th>Status</th>
            <th>Created Date</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>

          {categories.length === 0 ? (
            <tr>
              <td
                colSpan="5"
                className="empty-row"
              >
                No Categories Found
              </td>
            </tr>
          ) : (

            categories.map((item) => (

              <tr key={item.id}>

                <td>

                  <div className="category-name">

                    <div className="category-icon">
                      📂
                    </div>

                    <span>{item.name}</span>

                  </div>

                </td>

                <td>
                  {item.products}
                </td>

                <td>

                  <span
                    className={
                      item.status === "Active"
                        ? "status active"
                        : "status inactive"
                    }
                  >
                    {item.status}
                  </span>

                </td>

                <td>
                  {item.created}
                </td>

                <td>

                  <div className="table-actions">

                    {/*
                    <button
                      className="edit-btn"
                      onClick={() => onEdit(item)}
                    >
                      Edit
                    </button>
                    */}

                    {/*
                    <button
                      className="delete-btn"
                      onClick={() => onDelete(item.id)}
                    >
                      Delete
                    </button>
                    */}

                  </div>

                </td>

              </tr>

            ))

          )}

        </tbody>

      </table>

    </div>
  );
};

export default CategoryTable;