import React from "react";
import "./InventoryCards.css";
//import "../pages/Inventory/InventoryCards.css";

const cards = [

    {
        title:"Total Products",
        value:"520"
    },

    {
        title:"Stock Value",
        value:"₹12,50,000"
    },

    {
        title:"Available Stock",
        value:"8,250"
    },

    {
        title:"Low Stock",
        value:"18"
    },

    {
        title:"Out Of Stock",
        value:"9"
    },

    {
        title:"Expired Products",
        value:"5"
    }

];

const InventoryCards = () => {

    return (

        <div className="inventory-cards">

            {

                cards.map((card,index)=>(

                    <div className="inventory-card" key={index}>

                        <h3>{card.title}</h3>

                        <h2>{card.value}</h2>

                    </div>

                ))

            }

        </div>

    )

}

export default InventoryCards;