const Card = ({children, title}) => <div className="doc-card"><div className="title">{title}</div>{children}</div>

const display = {
    Object: ({data}) => {
        const props = data.property;
        const elems = [];

        for (const prop of props) {
            elems.push(
                <Card title={prop.name}>
                    <div style={{fontStyle: 'italic'}}>
                        {prop.type}
                    </div>
                    <div>
                        {prop.desc}
                    </div>
                </Card>
            );
        }

        return (
            // <Card title={data.name}>
            <div>
                <div className="doc-page-title">
                    <div className="title">{data.name}</div>
                    <div className="desc">{data.desc}</div>
                </div>
                <div>
                    {elems}
                </div>
            </div>
            // </Card>
        );
    }
};

(async () => {
    const response = await fetch("data.json");
    const data = await response.json();

    let items = [];
    let globals = [];
    for (const key of Object.keys(data)) {
        const item = data[key];

        if (item.type === 'Object') {
            items.push(<display.Object data={item} />);
        }
        globals.push(
            <div>{item.name}</div>
        );
    }

    ReactDOM.render(
        <div className="doc-content">
            <div className="global-names">
                {globals}
            </div>
            {items}
        </div>,
        document.body
    );
})();
