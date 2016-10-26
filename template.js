const Card = ({children, title}) => <div className="doc-card"><div className="title">{title}</div>{children}</div>

const display = {
    Object: ({data}) => {
        const props = data.property;
        const elems = [];

        for (const prop of props) {
            elems.push(
                <div className="doc-col" style={{width: '20%'}}>{prop.name}</div>
            );
            elems.push(
                <div className="doc-col" style={{width: '20%'}}>{prop.type}</div>
            );
            elems.push(
                <div className="doc-col" style={{width: '60%'}}>{prop.desc}</div>
            );
        }

        return (
            <Card title={data.name}>
                <div style={{fontStyle: "italic"}}>{data.desc}</div>
                <div>
                    {elems}
                    {/*{props.map(prop => <div className="doc-col">{prop.name}</div>)}*/}
                </div>
            </Card>
        );
    }
};

(async () => {
    const response = await fetch("data.json");
    const data = await response.json();

    let items = [];
    for (const key of Object.keys(data)) {
        const item = data[key];

        if (item.type === 'Object') {
            items.push(<display.Object data={item} />);
        }
    }

    ReactDOM.render(
        <div>{items}</div>,
        document.body
    );
})();
