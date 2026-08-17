import React from "react";
import { Nav } from "react-bootstrap";
import { Link, useLocation } from "react-router-dom";
import {
  Speedometer2,
  ShopWindow as ShopIcon,
  BoxSeam,
  ClipboardCheck,
  InfoCircleFill,
} from "react-bootstrap-icons";
import "../../css/SellerSidebar.css";

function SellerSidebar({ shopName }) {
  const location = useLocation();

  const isActive = (path, isEnd = false) => {
    if (isEnd) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const navLinks = [
    { path: "/toko-saya", text: "Dashboard", icon: Speedometer2, exact: true },
    { path: "/toko-saya/info", text: "Info Toko", icon: InfoCircleFill },
    { path: "/toko-saya/produk", text: "Kelola Produk", icon: BoxSeam },
    { path: "/toko-saya/pesanan", text: "Pesanan", icon: ClipboardCheck },
  ];

  return (
    <div className="seller-sidebar-wrapper">
      <div className="seller-sidebar-header">
        <div className="shop-icon-wrapper">
          <ShopIcon size={28} />
        </div>
        <h5 className="mb-0">{shopName || "Toko Saya"}</h5>
      </div>

      <Nav variant="pills" className="flex-column sidebar-nav">
        {navLinks.map((linkItem) => {
          const IconComponent = linkItem.icon;
          return (
            <Nav.Item key={linkItem.path}>
              <Nav.Link
                as={Link}
                to={linkItem.path}
                end={linkItem.exact}
                className={`sidebar-link ${
                  isActive(linkItem.path, linkItem.exact) ? "active" : ""
                }`}
              >
                <IconComponent size={18} />
                <span>{linkItem.text}</span>
              </Nav.Link>
            </Nav.Item>
          );
        })}
      </Nav>
    </div>
  );
}

SellerSidebar.defaultProps = {
  shopName: "Toko Saya",
};

export default SellerSidebar;
